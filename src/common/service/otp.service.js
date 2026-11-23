import { createHash } from "node:crypto";
import { client } from "../../database/connections/redis.connection.js";

export const hashOtp = (otp) =>
  createHash("sha256").update(String(otp)).digest("hex");

export const otpCacheKey = (email) => `otp:${email}`;
export const otpAttemptsCacheKey = (email) => `otp_attempts:${email}`;
export const otpCooldownCacheKey = (email) => `otp_cooldown:${email}`;

// Store a freshly generated OTP.
// Atomically acquires the resend cooldown (SET NX) before writing the code,
// so two concurrent sends cannot both mail codes or overwrite each other.
// The cooldown value is the OTP hash so a later cleanup can tell whether
// the keys still belong to this send.
// Returns true when the code was stored, false when the cooldown is held.
const STORE_SCRIPT = `
local acquired = redis.call('SET', KEYS[3], ARGV[1], 'EX', tonumber(ARGV[3]), 'NX')
if not acquired then
  return 0
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
redis.call('DEL', KEYS[2])
return 1
`;

export const storeOtp = async ({ email, otpHash, ttl, cooldownTtl }) => {
  const result = await client.eval(STORE_SCRIPT, {
    keys: [
      otpCacheKey(email),
      otpAttemptsCacheKey(email),
      otpCooldownCacheKey(email),
    ],
    arguments: [otpHash, String(ttl), String(cooldownTtl)],
  });

  return result === 1;
};

export const OTP_VERIFY_RESULT = Object.freeze({
  NO_CODE: -1,
  MISMATCH: 0,
  CONSUMED: 1,
  LOCKED: 2,
});

// Verify a presented OTP against the stored hash.
// A match consumes the code atomically (single GET+DEL inside the script),
// so two concurrent confirmations cannot both consume it. A mismatch counts
// an attempt; reaching maxAttempts destroys the code and reports LOCKED.
const VERIFY_SCRIPT = `
local stored = redis.call('GET', KEYS[1])
if not stored then
  return -1
end
if stored == ARGV[1] then
  redis.call('DEL', KEYS[1])
  redis.call('DEL', KEYS[2])
  return 1
end
local attempts = redis.call('INCR', KEYS[2])
if attempts == 1 then
  local ttl = redis.call('TTL', KEYS[1])
  if ttl > 0 then
    redis.call('EXPIRE', KEYS[2], ttl)
  end
end
if attempts >= tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[1])
  redis.call('DEL', KEYS[2])
  return 2
end
return 0
`;

export const verifyOtp = async ({ email, otp, maxAttempts }) => {
  return await client.eval(VERIFY_SCRIPT, {
    keys: [otpCacheKey(email), otpAttemptsCacheKey(email)],
    arguments: [hashOtp(otp), String(maxAttempts)],
  });
};

// Release OTP + cooldown after a failed send, but only when the keys still
// hold this send's hash. A newer send for the same email must survive the
// cleanup of an older failed one.
const RELEASE_SCRIPT = `
local released = 0
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('DEL', KEYS[1])
  released = 1
end
if redis.call('GET', KEYS[2]) == ARGV[1] then
  redis.call('DEL', KEYS[2])
  released = 1
end
return released
`;

export const releaseOtp = async ({ email, otpHash }) => {
  return await client.eval(RELEASE_SCRIPT, {
    keys: [otpCacheKey(email), otpCooldownCacheKey(email)],
    arguments: [otpHash],
  });
};
