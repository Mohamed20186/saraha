import { exceptions } from "../../common/exceptions/index.js";
import { hashEnum, security } from "../../common/index.js";
import { encryptData } from "../../common/security/encryption.js";
import { createToken, verifyToken } from "../../common/security/index.js";
import { TokenType } from "../../common/enums/tokenType.enum.js";
import { userRepo } from "../../repo/user.repo.js";
import { revokeToken } from "../../common/security/token-revocation.js";
import { logoutEnum } from "../../common/enums/logout.enum.js";
import { incrementTokenVersion, resetUserPassword } from "../../repo/user.repo.js";
import { sendMail } from "../../common/service/mail.service.js";
import {
  hashOtp,
  storeOtp,
  verifyOtp,
  releaseOtp,
  OTP_VERIFY_RESULT,
} from "../../common/service/otp.service.js";
import { randomInt } from "node:crypto";
import { buildEmailHtml } from "../../common/utils/mail.templates.js";

const OTP_TTL_SECONDS = 600;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

const normalizeEmail = (email) => email.trim().toLowerCase();

const sendVerificationOtp = async ({ email, firstName }) => {
  const otp = randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otp);

  const stored = await storeOtp({
    email,
    otpHash,
    ttl: OTP_TTL_SECONDS,
    cooldownTtl: OTP_RESEND_COOLDOWN_SECONDS,
  });

  if (!stored) {
    throw exceptions.tooManyRequests(
      "A verification code was sent recently. Please wait a minute before requesting a new one.",
    );
  }

  try {
    await sendMail({
      to: email,
      subject: "Your verification code",
      text: `Verification code: ${otp}. Valid for 10 minutes.`,
      html: buildEmailHtml({
        appName: "Saraha",
        title: "Email confirmation",
        greeting: `Hi ${firstName},`,
        message:
          "Use the following code to verify your account. The code is valid for 10 minutes.",
        otp,
        note: "If you didn't request the code, ignore this message.",
        dir: "ltr",
      }),
    });
  } catch (error) {
    await releaseOtp({ email, otpHash });
    throw error;
  }

  return { otpHash };
};

export const signup = async (data) => {
  data.email = normalizeEmail(data.email);

  const userExists = await userRepo.findOne({
    filter: { email: data.email },
    projection: { email: 1 },
  });

  if (userExists) {
    throw exceptions.conflict("user already exists");
  }

  data.password = await security.hashPassword({
    plainText: data.password,
    lib: hashEnum.argon,
  });

  if (data.phone !== undefined) {
    data.phone = encryptData({ plainText: data.phone });
  }

  
  const { otpHash } = await sendVerificationOtp({
    email: data.email,
    firstName: data.firstName,
  });

  try {
    const user = await userRepo.create({ data });
    return user;
  } catch (error) {
    await releaseOtp({ email: data.email, otpHash });
    
    if (error?.code === 11000) {
      throw exceptions.conflict("user already exists");
    }
    throw error;
  }
};

export const confirmEmail = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await userRepo.findOne({ filter: { email: normalizedEmail } });

  if (!user) {
    throw exceptions.badRequest("Invalid or expired OTP");
  }

  if (user.isVerified) {
    throw exceptions.badRequest("Email is already verified");
  }

  const result = await verifyOtp({
    email: normalizedEmail,
    otp,
    maxAttempts: OTP_MAX_ATTEMPTS,
  });

  if (result === OTP_VERIFY_RESULT.LOCKED) {
    throw exceptions.tooManyRequests(
      "Too many invalid attempts. Request a new verification code.",
    );
  }

  if (result !== OTP_VERIFY_RESULT.CONSUMED) {
    throw exceptions.badRequest("Invalid or expired OTP");
  }

  user.isVerified = true;
  await user.save();

  return true;
};

export const resendOtp = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await userRepo.findOne({ filter: { email: normalizedEmail } });

  if (!user) {
    throw exceptions.notFound("No account found with this email");
  }

  if (user.isVerified) {
    throw exceptions.badRequest("Email is already verified");
  }

  await sendVerificationOtp({ email: normalizedEmail, firstName: user.firstName });

  return true;
};



export const login = async (data) => {
    let userExists = await userRepo.findOne({filter: {email : normalizeEmail(data.email)}})
  if (!userExists) {
    throw exceptions.notFound("Invalid email or password");
  }
  const plainTextPass = await security.comparePassword({
    plainText: data.password,
    hashedPassword: userExists.password,
    lib: hashEnum.argon
  });
  if (!plainTextPass) {
    throw exceptions.notFound("Invalid email or password");
  }
  if (!userExists.isVerified) {
    throw exceptions.forbidden(
      "Email is not verified. Please verify your account to login.",
    );
  }
  return createToken({
    payload: {
      tokenVersion: userExists.tokenVersion ?? 0,
    },
    role: userExists.role,
    accessOptions: {
      subject: userExists.id,
      issuer: `${userExists.role}`,
      audience: [userExists.role],
    },
    refreshOptions: {
      subject: userExists.id,
      issuer: `${userExists.role}`,
      audience: [userExists.role],
    },
  });
};

export const rotateToken = async (refreshToken) => {
  const decoded = verifyToken({
    token: refreshToken,
    tokenType: TokenType.refreshTokenType,
  });

  if (
    typeof decoded === "string" ||
    !decoded.sub ||
    !decoded.jti ||
    !decoded.exp
  ) {
    throw new Error("Invalid refresh token payload");
  }


  const tokens = createToken({
    payload: {
      tokenVersion: decoded.tokenVersion ?? 0,
    },
    role: decoded.role,
    accessOptions: {
      subject: decoded.sub,
    },
    refreshOptions: {
      subject: decoded.sub,
    },
  });

  const revoked = await revokeToken({
    jti: decoded.jti,
    exp: decoded.exp,
  });

  if (!revoked) {
    throw exceptions.unauthorized("Refresh token has already been used or expired");
  }

  return tokens;
};

export const logout = async ({ userId, logoutType }) => {
  switch (logoutType) {
    case logoutEnum.ALL: {
      await incrementTokenVersion({
        id: userId,
      });

      return true;
    }

    case logoutEnum.DEVICE: {
      throw exceptions.badRequest("Device logout is not supported yet; use logoutType ALL");
    }

    default:
      throw exceptions.badRequest("Invalid logout type");
  }
};


// ---------- Password reset ----------
const RESET_PURPOSE = "reset";


export const forgotPassword = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await userRepo.findOne({ filter: { email: normalizedEmail } });

  // Unknown or unverified accounts get no code, but the response is identical.
  if (!user || !user.isVerified) {
    return true;
  }

  const otp = randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otp);

  const stored = await storeOtp({
    email: normalizedEmail,
    otpHash,
    ttl: OTP_TTL_SECONDS,
    cooldownTtl: OTP_RESEND_COOLDOWN_SECONDS,
    purpose: RESET_PURPOSE,
  });

  if (!stored) {
    return true;
  }

  try {
    await sendMail({
      to: normalizedEmail,
      subject: "Reset your password",
      text: `Password reset code: ${otp}. Valid for 10 minutes.`,
      html: buildEmailHtml({
        appName: "Saraha",
        title: "Password reset",
        greeting: `Hi ${user.firstName},`,
        message:
          "Use the following code to reset your password. The code is valid for 10 minutes.",
        otp,
        note: "If you didn't request a password reset, ignore this message. Your password will not change.",
        dir: "ltr",
      }),
    });
  } catch (error) {
    await releaseOtp({
      email: normalizedEmail,
      otpHash,
      purpose: RESET_PURPOSE,
    });
   
    console.error("forgot-password: could not send reset email");
  }

  return true;
};

export const resetPassword = async ({ email, otp, password }) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await userRepo.findOne({ filter: { email: normalizedEmail } });

  if (!user || !user.isVerified) {
    throw exceptions.badRequest("Invalid or expired OTP");
  }

  const result = await verifyOtp({
    email: normalizedEmail,
    otp,
    maxAttempts: OTP_MAX_ATTEMPTS,
    purpose: RESET_PURPOSE,
  });

  if (result === OTP_VERIFY_RESULT.LOCKED) {
    throw exceptions.tooManyRequests(
      "Too many invalid attempts. Request a new reset code.",
    );
  }

  if (result !== OTP_VERIFY_RESULT.CONSUMED) {
    throw exceptions.badRequest("Invalid or expired OTP");
  }

  const sameAsOld = await security.comparePassword({
    plainText: password,
    hashedPassword: user.password,
    lib: hashEnum.argon,
  });
  if (sameAsOld) {
    throw exceptions.badRequest(
      "New password must be different from the current password",
    );
  }

  const newPasswordHash = await security.hashPassword({
    plainText: password,
    lib: hashEnum.argon,
  });

  
  const changed = await resetUserPassword({
    id: user._id,
    oldPasswordHash: user.password,
    newPasswordHash,
  });
  if (!changed) {
    throw exceptions.conflict("Password was changed meanwhile. Request a new reset code.");
  }

  return true;
};
