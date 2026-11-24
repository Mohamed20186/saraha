import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concurrency tests against a real Redis server.
// Run with:
//   node --experimental-test-module-mocks --test src/tests/auth.otp.redis.test.js
// Uses the redis-server from PATH, or set REDIS_SERVER_BINARY=/path/to/redis-server.
// The file skips itself when no redis-server binary is available.

const redisBinary = process.env.REDIS_SERVER_BINARY || "redis-server";
const hasRedisBinary =
  spawnSync(redisBinary, ["--version"], { stdio: "ignore" }).status === 0;

if (!hasRedisBinary) {
  test("redis concurrency tests", { skip: "no redis-server binary available" }, () => {});
} else {
  process.env.NODE_ENV = "development";
  process.env.ENC_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.ALGORITHM = "aes-256-gcm";
  process.env.TOKEN_ALGORITHM = "HS256";
  process.env.ACCESS_EXPIRES_IN = "3600";
  process.env.REFRESH_EXPIRES_IN = "86400";
  process.env.JWT_ACCESS_ADMIN_SECRET = "test-access-admin";
  process.env.JWT_REFRESH_ADMIN_SECRET = "test-refresh-admin";
  process.env.JWT_ACCESS_USER_SECRET = "test-access-user";
  process.env.JWT_REFRESH_USER_SECRET = "test-refresh-user";

  const port = 16379 + Math.floor(Math.random() * 20000);
  const dataDir = mkdtempSync(join(tmpdir(), "saraha-redis-"));
  const server = spawn(
    redisBinary,
    ["--port", String(port), "--save", "", "--appendonly", "no", "--dir", dataDir],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("redis-server did not start in time")),
      15000,
    );
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Ready to accept")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on("exit", (code) =>
      reject(new Error(`redis-server exited early with code ${code}`)),
    );
  });

  process.env.REDIS_URI = `redis://127.0.0.1:${port}`;

  // ---------- Mocked state (repo + mail only; Redis is real) ----------
  let findOneResult = null;
  let createImpl = async ({ data }) => makeFakeDoc(data);
  let mailShouldFail = false;
  let mailCount = 0;
  let lastMail = null;

  const makeFakeDoc = (data) => ({
    id: "665f1f8a0b7f3c1a2b3c4d5e",
    ...data,
    _id: "665f1f8a0b7f3c1a2b3c4d5e",
    isVerified: data.isVerified ?? false,
    saveCount: 0,
    async save() {
      this.saveCount += 1;
      return this;
    },
  });

  const resetState = async (client) => {
    await client.flushAll();
    findOneResult = null;
    createImpl = async ({ data }) => makeFakeDoc(data);
    mailShouldFail = false;
    mailCount = 0;
    lastMail = null;
  };

  mock.module("../repo/user.repo.js", {
    namedExports: {
      userRepo: {
        findOne: async () => findOneResult,
        findById: async () => findOneResult,
        create: async ({ data }) => createImpl({ data }),
      },
      incrementTokenVersion: async () => ({}),
    resetUserPassword: async () => true,
      findUserByEmail: async () => null,
      findUsersByRole: async () => [],
      findUsersByName: async () => [],
    },
  });

  mock.module("../common/service/mail.service.js", {
    namedExports: {
      sendMail: async (opts) => {
        mailCount += 1;
        if (mailShouldFail) throw new Error("SMTP down");
        lastMail = opts;
        return { messageId: "test" };
      },
    },
  });

  const { client } = await import("../database/connections/redis.connection.js");
  await client.connect();

  after(async () => {
    if (client.isOpen) await client.close();
    server.kill();
    rmSync(dataDir, { recursive: true, force: true });
  });

  const as = await import("../module/auth/auth.services.js");
  const otpService = await import("../common/service/otp.service.js");
  const { createToken } = await import("../common/security/jwt.js");
  const { authenticate } = await import("../common/middleware/authentication.middleware.js");
  const { TokenType } = await import("../common/enums/tokenType.enum.js");

  const email = "user@example.com";
  const validSignup = {
    email,
    password: "Secret@123",
    confirmPassword: "Secret@123",
    firstName: "Mohamed",
    lastName: "Ahmed",
  };

  const mailedOtp = () => lastMail.text.match(/Verification code: (\d{6})/)[1];

  test("only the sha256 hash of the code is stored in Redis", async () => {
    await resetState(client);

    await as.signup({ ...validSignup });

    const raw = await client.get(`otp:${email}`);
    assert.match(raw, /^[0-9a-f]{64}$/);
    assert.equal(raw, otpService.hashOtp(mailedOtp()));
    assert.notEqual(raw, mailedOtp());
    assert.equal(await client.ttl(`otp:${email}`) > 0, true);
  });

  test("two concurrent confirmations cannot both consume one code", async () => {
    await resetState(client);
    const user = await as.signup({ ...validSignup });
    findOneResult = user;
    const code = mailedOtp();

    const results = await Promise.allSettled([
      as.confirmEmail({ email, otp: code }),
      as.confirmEmail({ email, otp: code }),
    ]);

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(succeeded.length, 1, "exactly one confirmation consumes the code");
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.statusCode, 400);
    assert.equal(user.isVerified, true);
    assert.equal(await client.get(`otp:${email}`), null);
  });

  test("concurrent wrong attempts count atomically and lock at 5", async () => {
    await resetState(client);
    const user = await as.signup({ ...validSignup });
    findOneResult = user;
    const code = mailedOtp();
    const wrong = code === "000000" ? "000001" : "000000";

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        as.confirmEmail({ email, otp: wrong }),
      ),
    );

    const statuses = results.map((r) => r.reason?.statusCode).sort();
    assert.deepEqual(statuses, [400, 400, 400, 400, 429]);
    assert.equal(await client.get(`otp:${email}`), null, "code destroyed at the limit");
    assert.equal(await client.get(`otp_attempts:${email}`), null);
    assert.equal(user.isVerified, false);
  });

  test("two concurrent resends send exactly one mail", async () => {
    await resetState(client);
    const user = await as.signup({ ...validSignup });
    findOneResult = user;
    await client.del(`otp_cooldown:${email}`); // simulate expired cooldown
    const mailsBefore = mailCount;

    const results = await Promise.allSettled([
      as.resendOtp({ email }),
      as.resendOtp({ email }),
    ]);

    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.statusCode, 429);
    assert.equal(mailCount, mailsBefore + 1, "exactly one mail went out");
  });

  test("two concurrent signups for one email send one mail and create one user", async () => {
    await resetState(client);
    let creates = 0;
    createImpl = async ({ data }) => {
      creates += 1;
      return makeFakeDoc(data);
    };

    const results = await Promise.allSettled([
      as.signup({ ...validSignup }),
      as.signup({ ...validSignup }),
    ]);

    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.statusCode, 429, "loser hits the atomic cooldown");
    assert.equal(mailCount, 1);
    assert.equal(creates, 1);
  });

  test("a failed signup cleanup cannot delete a newer send's code", async () => {
    await resetState(client);

    // First send holds hash A.
    const storedA = await otpService.storeOtp({
      email,
      otpHash: otpService.hashOtp("111111"),
      ttl: 600,
      cooldownTtl: 60,
    });
    assert.equal(storedA, true);

    // Its cooldown expires and a newer send stores hash B.
    await client.del(`otp_cooldown:${email}`);
    const storedB = await otpService.storeOtp({
      email,
      otpHash: otpService.hashOtp("222222"),
      ttl: 600,
      cooldownTtl: 60,
    });
    assert.equal(storedB, true);

    // The stale cleanup for send A must not touch send B's keys.
    await otpService.releaseOtp({ email, otpHash: otpService.hashOtp("111111") });

    assert.equal(await client.get(`otp:${email}`), otpService.hashOtp("222222"));
    const result = await otpService.verifyOtp({ email, otp: "222222", maxAttempts: 5 });
    assert.equal(result, 1, "the newer code still verifies");
  });

  test("a failed mail send releases the code and cooldown for a retry", async () => {
    await resetState(client);
    mailShouldFail = true;

    await assert.rejects(as.signup({ ...validSignup }), /SMTP down/);

    assert.equal(await client.get(`otp:${email}`), null);
    assert.equal(await client.get(`otp_cooldown:${email}`), null);

    mailShouldFail = false;
    await as.signup({ ...validSignup });
    assert.equal(mailCount, 2, "retry sends a fresh mail");
    assert.ok(await client.get(`otp:${email}`));
  });

  test("authenticate blocks unverified users and admits verified ones", async () => {
    await resetState(client);
    const tokenFor = (isVerified) => {
      findOneResult = makeFakeDoc({
        email,
        role: 0,
        tokenVersion: 0,
        isVerified,
      });
      return createToken({
        payload: { tokenVersion: 0 },
        role: 0,
        accessOptions: { subject: findOneResult.id },
        refreshOptions: { subject: findOneResult.id },
      }).accessToken;
    };

    const runAuth = async (token) => {
      const req = { headers: { authorization: `Bearer ${token}` } };
      const result = { status: 200, next: false };
      const res = {
        status(n) { result.status = n; return this; },
        json(body) { result.body = body; return this; },
      };
      await authenticate({ tokenType: TokenType.accessTokenType })(
        req,
        res,
        () => { result.next = true; },
      );
      return result;
    };

    const blocked = await runAuth(tokenFor(false));
    assert.equal(blocked.status, 403);
    assert.equal(blocked.next, false);
    assert.match(blocked.body.message, /not verified/);

    const allowed = await runAuth(tokenFor(true));
    assert.equal(allowed.status, 200);
    assert.equal(allowed.next, true);
  });
}
