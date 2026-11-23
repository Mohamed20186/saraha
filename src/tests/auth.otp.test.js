import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createHash } from "node:crypto";

// Run with: node --experimental-test-module-mocks --test src/tests/auth.otp.test.js
// Unit-level: Redis operations are mocked sequentially. Real concurrency
// semantics are covered by src/tests/auth.otp.redis.test.js.

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

// ---------- Fake state ----------
const otpStore = new Map(); // key -> { value, ttl }
let calls = [];
let mailShouldFail = false;
let createError = null;
let findOneResult = null;
let findByIdResult = null;
let lastFindByIdArgs = null;
let lastMail = null;
let mailCount = 0;

const resetState = () => {
  otpStore.clear();
  calls = [];
  mailShouldFail = false;
  createError = null;
  findOneResult = null;
  findByIdResult = null;
  lastFindByIdArgs = null;
  lastMail = null;
  mailCount = 0;
};

const makeFakeDoc = (data) => ({
  id: "665f1f8a0b7f3c1a2b3c4d5e",
  ...data,
  _id: "665f1f8a0b7f3c1a2b3c4d5e",
  isVerified: data.isVerified ?? false,
  saved: false,
  async save() {
    this.saved = true;
    return this;
  },
});

const hashOtpImpl = (otp) =>
  createHash("sha256").update(String(otp)).digest("hex");

// ---------- Module mocks ----------
mock.module("../repo/user.repo.js", {
  namedExports: {
    userRepo: {
      findOne: async () => findOneResult,
      findById: async (args) => {
        lastFindByIdArgs = args;
        return findByIdResult;
      },
      create: async ({ data }) => {
        calls.push("create");
        if (createError) throw createError;
        return makeFakeDoc(data);
      },
    },
    incrementTokenVersion: async () => ({}),
    findUserByEmail: async () => null,
    findUsersByRole: async () => [],
    findUsersByName: async () => [],
  },
});

mock.module("../common/service/otp.service.js", {
  namedExports: {
    hashOtp: hashOtpImpl,
    OTP_VERIFY_RESULT: Object.freeze({
      NO_CODE: -1,
      MISMATCH: 0,
      CONSUMED: 1,
      LOCKED: 2,
    }),
    otpCacheKey: (email) => `otp:${email}`,
    otpAttemptsCacheKey: (email) => `otp_attempts:${email}`,
    otpCooldownCacheKey: (email) => `otp_cooldown:${email}`,
    storeOtp: async ({ email, otpHash, ttl, cooldownTtl }) => {
      calls.push("otp:store");
      if (otpStore.has(`otp_cooldown:${email}`)) return false;
      otpStore.set(`otp_cooldown:${email}`, { value: otpHash, ttl: cooldownTtl });
      otpStore.set(`otp:${email}`, { value: otpHash, ttl });
      otpStore.delete(`otp_attempts:${email}`);
      return true;
    },
    verifyOtp: async ({ email, otp, maxAttempts }) => {
      calls.push("otp:verify");
      const entry = otpStore.get(`otp:${email}`);
      if (!entry) return -1;
      if (entry.value === hashOtpImpl(otp)) {
        otpStore.delete(`otp:${email}`);
        otpStore.delete(`otp_attempts:${email}`);
        return 1;
      }
      const attempts = (otpStore.get(`otp_attempts:${email}`)?.value ?? 0) + 1;
      otpStore.set(`otp_attempts:${email}`, { value: attempts, ttl: entry.ttl });
      if (attempts >= maxAttempts) {
        otpStore.delete(`otp:${email}`);
        otpStore.delete(`otp_attempts:${email}`);
        return 2;
      }
      return 0;
    },
    releaseOtp: async ({ email, otpHash }) => {
      calls.push("otp:release");
      let released = 0;
      if (otpStore.get(`otp:${email}`)?.value === otpHash) {
        otpStore.delete(`otp:${email}`);
        released = 1;
      }
      if (otpStore.get(`otp_cooldown:${email}`)?.value === otpHash) {
        otpStore.delete(`otp_cooldown:${email}`);
        released = 1;
      }
      return released;
    },
  },
});

mock.module("../common/service/mail.service.js", {
  namedExports: {
    sendMail: async (opts) => {
      calls.push("mail");
      mailCount += 1;
      if (mailShouldFail) throw new Error("SMTP down");
      lastMail = opts;
      return { messageId: "test" };
    },
  },
});

const as = await import("../module/auth/auth.services.js");
const us = await import("../module/user/user.services.js");
const { User } = await import("../database/models/user.model.js");
const { decryptData } = await import("../common/security/encryption.js");
const { security, hashEnum } = await import("../common/index.js");
const validation = await import("../module/auth/auth.validation.js");
const userValidation = await import("../module/user/user.validation.js");

const t = (key) => key;

const validSignup = {
  email: "user@example.com",
  password: "Secret@123",
  confirmPassword: "Secret@123",
  firstName: "Mohamed",
  lastName: "Ahmed",
};

const mailedOtp = () => lastMail.text.match(/Verification code: (\d{6})/)[1];
const wrongOtp = () => (mailedOtp() === "000000" ? "000001" : "000000");

const signupAndGetUser = async (overrides = {}) => {
  const user = await as.signup({ ...validSignup, ...overrides });
  findOneResult = user;
  return user;
};

// ---------- Signup ----------

test("signup without phone succeeds, mails a code, and caches only its hash", async () => {
  resetState();

  const user = await as.signup({ ...validSignup });

  assert.deepEqual(calls, ["otp:store", "mail", "create"]);
  assert.equal(user.phone, undefined);
  assert.equal(lastMail.to, validSignup.email);

  const code = mailedOtp();
  const stored = otpStore.get(`otp:${validSignup.email}`);
  assert.equal(stored.ttl, 600);
  assert.match(stored.value, /^[0-9a-f]{64}$/, "only the sha256 hash is cached");
  assert.equal(stored.value, hashOtpImpl(code));
  assert.notEqual(stored.value, code);
  assert.equal(otpStore.get(`otp_cooldown:${validSignup.email}`).ttl, 60);
});

test("signup normalizes the email for the account, cache keys and mail", async () => {
  resetState();

  const user = await as.signup({ ...validSignup, email: "  User@Example.COM " });

  assert.equal(user.email, "user@example.com");
  assert.equal(lastMail.to, "user@example.com");
  assert.ok(otpStore.has("otp:user@example.com"));
});

test("signup with phone stores it encrypted", async () => {
  resetState();

  const user = await as.signup({ ...validSignup, phone: "01012345678" });

  assert.ok(user.phone.startsWith("v1::"), "phone stored encrypted");
  assert.equal(decryptData({ encryptedText: user.phone }), "01012345678");
});

test("signup fails fast when the email already exists", async () => {
  resetState();
  findOneResult = makeFakeDoc({ email: validSignup.email });

  await assert.rejects(
    as.signup({ ...validSignup }),
    (err) => err.statusCode === 409,
  );
  assert.deepEqual(calls, []);
});

test("signup maps a lost insert race (duplicate key) to 409 and releases its keys", async () => {
  resetState();
  const duplicateKeyError = new Error("E11000 duplicate key error");
  duplicateKeyError.code = 11000;
  createError = duplicateKeyError;

  await assert.rejects(
    as.signup({ ...validSignup }),
    (err) => err.statusCode === 409,
  );
  assert.equal(otpStore.has(`otp:${validSignup.email}`), false);
  assert.equal(otpStore.has(`otp_cooldown:${validSignup.email}`), false);
});

test("signup does not create the user when the OTP mail fails and cleans up", async () => {
  resetState();
  mailShouldFail = true;

  await assert.rejects(as.signup({ ...validSignup }), /SMTP down/);
  assert.ok(!calls.includes("create"), "user must not be saved before mail");
  assert.equal(otpStore.has(`otp:${validSignup.email}`), false);
  assert.equal(otpStore.has(`otp_cooldown:${validSignup.email}`), false);
});

test("signup releases its own OTP if saving the user fails after mailing", async () => {
  resetState();
  createError = new Error("db write failed");

  await assert.rejects(as.signup({ ...validSignup }), /db write failed/);
  assert.deepEqual(calls, ["otp:store", "mail", "create", "otp:release"]);
  assert.equal(otpStore.has(`otp:${validSignup.email}`), false);
});

// ---------- Confirm email ----------

test("confirmEmail verifies the user with the mailed code", async () => {
  resetState();
  const user = await signupAndGetUser();

  const result = await as.confirmEmail({
    email: validSignup.email,
    otp: mailedOtp(),
  });

  assert.equal(result, true);
  assert.equal(user.isVerified, true);
  assert.equal(user.saved, true);
  assert.equal(otpStore.has(`otp:${validSignup.email}`), false);
});

test("confirmEmail matches regardless of email letter case", async () => {
  resetState();
  const user = await signupAndGetUser();

  await as.confirmEmail({ email: "USER@EXAMPLE.COM", otp: mailedOtp() });

  assert.equal(user.isVerified, true);
});

test("confirmEmail rejects a wrong or missing code without verifying", async () => {
  resetState();
  const user = await signupAndGetUser();

  await assert.rejects(
    as.confirmEmail({ email: validSignup.email, otp: wrongOtp() }),
    (err) => err.statusCode === 400,
  );
  assert.equal(user.isVerified, false);
  assert.equal(otpStore.get(`otp_attempts:${validSignup.email}`).value, 1);
  assert.equal(
    otpStore.get(`otp_attempts:${validSignup.email}`).ttl,
    600,
    "attempts counter shares the code lifetime",
  );

  otpStore.clear();
  await assert.rejects(
    as.confirmEmail({ email: validSignup.email, otp: "123456" }),
    (err) => err.statusCode === 400,
  );
  assert.equal(user.isVerified, false);
});

test("confirmEmail locks the code after 5 wrong attempts", async () => {
  resetState();
  const user = await signupAndGetUser();
  const correct = mailedOtp();
  const wrong = correct === "000000" ? "000001" : "000000";

  for (let i = 0; i < 4; i++) {
    await assert.rejects(
      as.confirmEmail({ email: validSignup.email, otp: wrong }),
      (err) => err.statusCode === 400,
    );
  }

  await assert.rejects(
    as.confirmEmail({ email: validSignup.email, otp: wrong }),
    (err) => err.statusCode === 429,
  );

  assert.equal(otpStore.has(`otp:${validSignup.email}`), false);

  await assert.rejects(
    as.confirmEmail({ email: validSignup.email, otp: correct }),
    (err) => err.statusCode === 400,
    "even the correct code is dead after the lockout",
  );
  assert.equal(user.isVerified, false);
});

test("confirmEmail does not reveal whether the account exists", async () => {
  resetState();

  await assert.rejects(
    as.confirmEmail({ email: "ghost@example.com", otp: "123456" }),
    (err) => err.statusCode === 400 && err.message === "Invalid or expired OTP",
  );
});

test("confirmEmail rejects an already verified email", async () => {
  resetState();
  await signupAndGetUser({ isVerified: true });

  await assert.rejects(
    as.confirmEmail({ email: validSignup.email, otp: "123456" }),
    (err) => err.statusCode === 400 && err.message === "Email is already verified",
  );
});

// ---------- Resend OTP ----------

test("resendOtp sends a fresh code for an unverified user after the cooldown", async () => {
  resetState();
  await signupAndGetUser();
  otpStore.delete(`otp_cooldown:${validSignup.email}`); // simulate cooldown expiry
  const firstCode = mailedOtp();

  await as.resendOtp({ email: validSignup.email });

  assert.equal(mailCount, 2);
  assert.notEqual(mailedOtp() === firstCode && otpStore.get(`otp:${validSignup.email}`).value === hashOtpImpl(firstCode), true);
  assert.ok(otpStore.has(`otp_cooldown:${validSignup.email}`));
});

test("resendOtp rejects requests inside the 60 second cooldown", async () => {
  resetState();
  await signupAndGetUser();
  const mailsBefore = mailCount;

  await assert.rejects(
    as.resendOtp({ email: validSignup.email }),
    (err) => err.statusCode === 429,
  );
  assert.equal(mailCount, mailsBefore, "no mail sent during cooldown");
});

test("resendOtp returns 404 for unknown email and 400 for verified email", async () => {
  resetState();

  await assert.rejects(
    as.resendOtp({ email: "ghost@example.com" }),
    (err) => err.statusCode === 404,
  );

  await signupAndGetUser({ isVerified: true });
  await assert.rejects(
    as.resendOtp({ email: validSignup.email }),
    (err) => err.statusCode === 400,
  );
  assert.equal(mailCount, 1, "only the signup mail was sent");
});

// ---------- Login verification gate ----------

test("login rejects unverified accounts with 403", async () => {
  resetState();
  const hashed = await security.hashPassword({
    plainText: validSignup.password,
    lib: hashEnum.argon,
  });
  findOneResult = makeFakeDoc({
    email: validSignup.email,
    password: hashed,
    role: 0,
    tokenVersion: 0,
    isVerified: false,
  });

  await assert.rejects(
    as.login({ email: validSignup.email, password: validSignup.password }),
    (err) => err.statusCode === 403 && /not verified/.test(err.message),
  );
});

test("login returns tokens for verified accounts", async () => {
  resetState();
  const hashed = await security.hashPassword({
    plainText: validSignup.password,
    lib: hashEnum.argon,
  });
  findOneResult = makeFakeDoc({
    email: validSignup.email,
    password: hashed,
    role: 0,
    tokenVersion: 0,
    isVerified: true,
  });

  const tokens = await as.login({
    email: " USER@example.com ",
    password: validSignup.password,
  });

  assert.ok(tokens.accessToken);
  assert.ok(tokens.refreshToken);
});

test("login rejects wrong password and unknown email with the same 404", async () => {
  resetState();
  const hashed = await security.hashPassword({
    plainText: validSignup.password,
    lib: hashEnum.argon,
  });
  findOneResult = makeFakeDoc({
    email: validSignup.email,
    password: hashed,
    role: 0,
    isVerified: true,
  });

  await assert.rejects(
    as.login({ email: validSignup.email, password: "Wrong@123" }),
    (err) => err.statusCode === 404 && err.message === "Invalid email or password",
  );

  findOneResult = null;
  await assert.rejects(
    as.login({ email: "ghost@example.com", password: validSignup.password }),
    (err) => err.statusCode === 404 && err.message === "Invalid email or password",
  );
});

// ---------- User model ----------

test("user model defaults isVerified to false and strips password from JSON", async () => {
  const user = new User({
    firstName: "Mohamed",
    lastName: "Ahmed",
    email: "user@example.com",
    password: "argon2-hash-value",
  });

  assert.equal(user.isVerified, false);

  const json = JSON.parse(JSON.stringify(user));
  assert.equal(json.password, undefined);
  assert.equal(json.isVerified, false);
});

// ---------- Profile update & public profile ----------

test("updateUser encrypts a new phone and updates names", async () => {
  resetState();
  const user = makeFakeDoc({
    email: validSignup.email,
    firstName: "Old",
    lastName: "Name",
  });
  findByIdResult = user;

  const updated = await us.updateUser(user._id, {
    firstName: "New",
    phone: "01098765432",
  });

  assert.equal(updated.firstName, "New");
  assert.equal(updated.lastName, "Name");
  assert.ok(updated.phone.startsWith("v1::"));
  assert.equal(decryptData({ encryptedText: updated.phone }), "01098765432");
  assert.equal(updated.saved, true);
});

test("getPublicProfile excludes password, email and phone", async () => {
  resetState();
  findByIdResult = makeFakeDoc({ email: validSignup.email });

  await us.getPublicProfile("665f1f8a0b7f3c1a2b3c4d5e");

  assert.deepEqual(lastFindByIdArgs.projection, {
    password: 0,
    email: 0,
    phone: 0,
  });
});

test("getUserById throws an operational 404", async () => {
  resetState();

  await assert.rejects(
    us.getUserById("665f1f8a0b7f3c1a2b3c4d5e"),
    (err) => err.statusCode === 404 && err.message === "User not found",
  );
});

// ---------- Validation schemas ----------

test("signup schema accepts a body without phone", () => {
  const schema = validation.signupSchema(t);
  const result = schema.safeParse({ body: { ...validSignup } });
  assert.equal(result.success, true);
});

test("confirmEmail schema requires a 6-digit code", () => {
  const schema = validation.confirmEmailSchema(t);

  assert.equal(
    schema.safeParse({ body: { email: validSignup.email, otp: "123456" } })
      .success,
    true,
  );
  assert.equal(
    schema.safeParse({ body: { email: validSignup.email, otp: "12345" } })
      .success,
    false,
  );
  assert.equal(
    schema.safeParse({ body: { email: validSignup.email, otp: "abcdef" } })
      .success,
    false,
  );
  assert.equal(
    schema.safeParse({ body: { email: validSignup.email } }).success,
    false,
  );
});

test("updateProfile schema rejects empty bodies and unknown fields", () => {
  const schema = userValidation.updateProfileSchema(t);

  assert.equal(schema.safeParse({ body: {} }).success, false);
  assert.equal(schema.safeParse({ body: { role: 1 } }).success, false);
  assert.equal(
    schema.safeParse({ body: { firstName: "Mohamed" } }).success,
    true,
  );
  assert.equal(
    schema.safeParse({ body: { phone: "01012345678" } }).success,
    true,
  );
  assert.equal(schema.safeParse({ body: { phone: "123" } }).success, false);
});

test("userProfile schema works without a query string", () => {
  const schema = userValidation.userProfileSchema(t);

  const ok = schema.safeParse({
    params: { userId: "665f1f8a0b7f3c1a2b3c4d5e" },
  });
  assert.equal(ok.success, true);

  const bad = schema.safeParse({ params: { userId: "not-an-id" } });
  assert.equal(bad.success, false);
});
