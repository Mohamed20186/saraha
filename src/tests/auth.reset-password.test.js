import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Run with: node --experimental-test-module-mocks --test src/tests/auth.reset-password.test.js
Object.assign(process.env, {
  NODE_ENV: "development",
  ENC_KEY: Buffer.alloc(32, 7).toString("base64"),
  ALGORITHM: "aes-256-gcm",
  TOKEN_ALGORITHM: "HS256",
  ACCESS_EXPIRES_IN: "3600",
  REFRESH_EXPIRES_IN: "86400",
  JWT_ACCESS_ADMIN_SECRET: "a",
  JWT_REFRESH_ADMIN_SECRET: "b",
  JWT_ACCESS_USER_SECRET: "c",
  JWT_REFRESH_USER_SECRET: "d",
});

const store = new Map();
let user = null;
let lastMail = null;
let mailCount = 0;
let mailFails = false;
let writeFails = false;
let raceBeforeWrite = false;
const h = (o) => createHash("sha256").update(String(o)).digest("hex");
const k = (p, e) => `${p}:${e}`;

mock.module("../repo/user.repo.js", {
  namedExports: {
    userRepo: { findOne: async () => user },
    incrementTokenVersion: async () => ({}),
    resetUserPassword: async ({ oldPasswordHash, newPasswordHash }) => {
      if (writeFails) throw new Error("mongo down");
      if (raceBeforeWrite) user.password = "someone-else-changed-it";
      if (user.password !== oldPasswordHash) return false;
      user.password = newPasswordHash;
      user.tokenVersion += 1;
      user.saved = true;
      return true;
    },
    findUserByEmail: async () => null,
    findUsersByRole: async () => [],
    findUsersByName: async () => [],
  },
});
mock.module("../common/service/otp.service.js", {
  namedExports: {
    hashOtp: h,
    OTP_VERIFY_RESULT: Object.freeze({ NO_CODE: -1, MISMATCH: 0, CONSUMED: 1, LOCKED: 2 }),
    storeOtp: async ({ email, otpHash, purpose = "" }) => {
      if (store.has(k(`cd${purpose}`, email))) return false;
      store.set(k(`cd${purpose}`, email), otpHash);
      store.set(k(`otp${purpose}`, email), otpHash);
      return true;
    },
    verifyOtp: async ({ email, otp, maxAttempts, purpose = "" }) => {
      const key = k(`otp${purpose}`, email);
      if (!store.has(key)) return -1;
      if (store.get(key) === h(otp)) {
        store.delete(key);
        return 1;
      }
      const ak = k(`att${purpose}`, email);
      const n = (store.get(ak) ?? 0) + 1;
      store.set(ak, n);
      if (n >= maxAttempts) {
        store.delete(key);
        return 2;
      }
      return 0;
    },
    releaseOtp: async ({ email, purpose = "" }) => {
      store.delete(k(`otp${purpose}`, email));
      store.delete(k(`cd${purpose}`, email));
    },
  },
});
mock.module("../common/service/mail.service.js", {
  namedExports: {
    sendMail: async (o) => {
      mailCount += 1;
      if (mailFails) throw new Error("SMTP down");
      lastMail = o;
    },
  },
});

const as = await import("../module/auth/auth.services.js");
const v = await import("../module/auth/auth.validation.js");
const { security, hashEnum } = await import("../common/index.js");
const t = (key) => key;

const reset = async (over = {}) => {
  store.clear();
  lastMail = null;
  mailCount = 0;
  mailFails = false;
  writeFails = false;
  raceBeforeWrite = false;
  user = {
    email: "u@example.com",
    firstName: "Mohamed",
    isVerified: true,
    tokenVersion: 2,
    password: await security.hashPassword({ plainText: "Old@pass1", lib: hashEnum.argon }),
    saved: false,
    async save() { this.saved = true; },
    ...over,
  };
};
const code = () => lastMail.text.match(/(\d{6})/)[1];

test("forgot-password mails a code for a verified user", async () => {
  await reset();
  await as.forgotPassword({ email: " U@Example.com " });
  assert.equal(lastMail.to, "u@example.com");
  assert.match(lastMail.text, /Password reset code: \d{6}/);
  assert.equal(store.get("otpreset:u@example.com"), h(code()));
});

test("forgot-password sends nothing for unknown or unverified users, same result", async () => {
  await reset();
  user = null;
  assert.equal(await as.forgotPassword({ email: "x@example.com" }), true);
  await reset({ isVerified: false });
  assert.equal(await as.forgotPassword({ email: "u@example.com" }), true);
  assert.equal(mailCount, 0);
});

test("forgot-password cooldown: second call sends no second mail", async () => {
  await reset();
  await as.forgotPassword({ email: "u@example.com" });
  await as.forgotPassword({ email: "u@example.com" });
  assert.equal(mailCount, 1);
});

test("forgot-password mail failure is swallowed (no enumeration) and code released", async () => {
  await reset();
  mailFails = true;
  assert.equal(await as.forgotPassword({ email: "u@example.com" }), true);
  assert.equal(store.size, 0, "code released so the user can ask again");
  mailFails = false;
  await as.forgotPassword({ email: "u@example.com" });
  assert.equal(mailCount, 2, "retry sends immediately, no stuck cooldown");
});

test("reset-password with right code changes hash, bumps tokenVersion, consumes code", async () => {
  await reset();
  await as.forgotPassword({ email: "u@example.com" });
  await as.resetPassword({ email: "u@example.com", otp: code(), password: "New@pass9" });
  assert.equal(user.saved, true);
  assert.equal(user.tokenVersion, 3);
  assert.ok(await security.comparePassword({ plainText: "New@pass9", hashedPassword: user.password, lib: hashEnum.argon }));
  await assert.rejects(
    as.resetPassword({ email: "u@example.com", otp: code(), password: "Other@pass9" }),
    /Invalid or expired OTP/,
  );
});

test("reset-password rejects wrong code, locks after 5, never changes password", async () => {
  await reset();
  await as.forgotPassword({ email: "u@example.com" });
  const good = code();
  const bad = good === "000000" ? "000001" : "000000";
  const before = user.password;
  for (let i = 0; i < 4; i++)
    await assert.rejects(as.resetPassword({ email: "u@example.com", otp: bad, password: "New@pass9" }), /Invalid or expired OTP/);
  await assert.rejects(as.resetPassword({ email: "u@example.com", otp: bad, password: "New@pass9" }), /Too many/);
  await assert.rejects(as.resetPassword({ email: "u@example.com", otp: good, password: "New@pass9" }), /Invalid or expired OTP/);
  assert.equal(user.password, before);
  assert.equal(user.saved, false);
});

test("reset-password rejects the current password and unknown users", async () => {
  await reset();
  await as.forgotPassword({ email: "u@example.com" });
  await assert.rejects(as.resetPassword({ email: "u@example.com", otp: code(), password: "Old@pass1" }), /different/);
  user = null;
  await assert.rejects(as.resetPassword({ email: "n@example.com", otp: "123456", password: "New@pass9" }), /Invalid or expired OTP/);
});

test("a verification code cannot be used as a reset code", async () => {
  await reset();
  store.set("otp:u@example.com", h("123456"));
  await assert.rejects(as.resetPassword({ email: "u@example.com", otp: "123456", password: "New@pass9" }), /Invalid or expired OTP/);
});

test("validation: strong password, matching confirm, strict keys, 6-digit otp", () => {
  const ok = { email: "u@example.com", otp: "123456", password: "New@pass9", confirmPassword: "New@pass9" };
  assert.ok(v.resetPasswordSchema(t).safeParse({ body: ok }).success);
  for (const bad of [
    { ...ok, password: "weak", confirmPassword: "weak" },
    { ...ok, confirmPassword: "Different@1" },
    { ...ok, otp: "12" },
    { ...ok, extra: 1 },
  ]) assert.equal(v.resetPasswordSchema(t).safeParse({ body: bad }).success, false);
  assert.ok(v.forgotPasswordSchema(t).safeParse({ body: { email: "u@example.com" } }).success);
});

test("Mongo write failure leaves password unchanged; fresh code works after cooldown", async () => {
  await reset();
  await as.forgotPassword({ email: "u@example.com" });
  writeFails = true;
  const before = user.password;
  await assert.rejects(as.resetPassword({ email: "u@example.com", otp: code(), password: "New@pass9" }), /mongo down/);
  assert.equal(user.password, before);
  assert.equal(user.tokenVersion, 2);
  // The code was consumed; the user must request another one.
  await assert.rejects(as.resetPassword({ email: "u@example.com", otp: code(), password: "New@pass9" }), /Invalid or expired OTP/);
});

test("password changed concurrently between check and write gives a conflict", async () => {
  await reset();
  await as.forgotPassword({ email: "u@example.com" });
  const otp = code();
  raceBeforeWrite = true; // another writer changes the hash first
  await assert.rejects(as.resetPassword({ email: "u@example.com", otp, password: "New@pass9" }), /changed meanwhile/);
  assert.equal(user.password, "someone-else-changed-it");
});
