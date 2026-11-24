import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Concurrency tests against a real Redis server.
// Run with:
//   node --experimental-test-module-mocks --test src/tests/auth.reset-password.redis.test.js
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
  const writes = [];
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
    resetUserPassword: async ({ newPasswordHash }) => {
        writes.push(newPasswordHash);
        await new Promise((r) => setTimeout(r, 5));
        return true;
      },
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
  const { hashOtp } = await import("../common/service/otp.service.js");
  const { security, hashEnum } = await import("../common/index.js");
  const email = "u@example.com";

  const freshUser = async () => {
    await resetState(client);
    writes.length = 0;
    findOneResult = {
      _id: "665f1f8a0b7f3c1a2b3c4d5e",
      email,
      firstName: "Mohamed",
      isVerified: true,
      password: await security.hashPassword({ plainText: "Old@pass1", lib: hashEnum.argon }),
    };
  };
  const code = () => lastMail.text.match(/(\d{6})/)[1];

  test("real redis: 25 parallel resets with one valid code, exactly one write", async () => {
    await freshUser();
    await as.forgotPassword({ email });
    const otp = code();
    const results = await Promise.allSettled(
      Array.from({ length: 25 }, () => as.resetPassword({ email, otp, password: "New@pass9" })),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(writes.length, 1);
    assert.equal(await client.exists(`otp:reset:${email}`), 0);
  });

  test("real redis: 40 parallel wrong guesses lock at 5 and destroy the code", async () => {
    await freshUser();
    await as.forgotPassword({ email });
    const good = code();
    const bad = good === "000000" ? "000001" : "000000";
    const results = await Promise.allSettled(
      Array.from({ length: 40 }, () => as.resetPassword({ email, otp: bad, password: "New@pass9" })),
    );
    const locked = results.filter((r) => /Too many/.test(r.reason?.message)).length;
    assert.equal(locked, 1, "exactly one request sees the lock");
    await assert.rejects(as.resetPassword({ email, otp: good, password: "New@pass9" }), /Invalid or expired/);
    assert.equal(writes.length, 0);
  });

  test("real redis: parallel forgot-password sends one mail (cooldown is atomic)", async () => {
    await freshUser();
    await Promise.all(Array.from({ length: 20 }, () => as.forgotPassword({ email })));
    assert.equal(mailCount, 1);
    assert.equal(await client.ttl(`otp_cooldown:reset:${email}`) > 0, true);
  });

  test("real redis: signup code and reset code are independent", async () => {
    await freshUser();
    await client.set(`otp:${email}`, hashOtp("111111"), { EX: 600 });
    await as.forgotPassword({ email });
    await assert.rejects(as.resetPassword({ email, otp: "111111", password: "New@pass9" }), /Invalid or expired/);
    assert.equal(await client.get(`otp:${email}`), hashOtp("111111"), "signup code untouched");
    await as.resetPassword({ email, otp: code(), password: "New@pass9" });
  });

  test("real redis: mail failure releases code and cooldown, retry sends at once", async () => {
    await freshUser();
    mailShouldFail = true;
    assert.equal(await as.forgotPassword({ email }), true);
    assert.equal(await client.exists(`otp:reset:${email}`), 0);
    assert.equal(await client.exists(`otp_cooldown:reset:${email}`), 0);
    mailShouldFail = false;
    await as.forgotPassword({ email });
    assert.ok(lastMail);
  });
}
