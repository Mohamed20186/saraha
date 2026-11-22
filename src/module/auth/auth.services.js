import { exceptions } from "../../common/exceptions/index.js";
import { hashEnum, security } from "../../common/index.js";
import { encryptData } from "../../common/security/encryption.js";
import { createToken, verifyToken } from "../../common/security/index.js";
import { TokenType } from "../../common/enums/tokenType.enum.js";
import { userRepo } from "../../repo/user.repo.js";
import { revokeToken } from "../../common/security/token-revocation.js";
import { logoutEnum } from "../../common/enums/logout.enum.js";
import { incrementTokenVersion } from "../../repo/user.repo.js";
import { sendMail } from "../../common/service/mail.service.js";
import { setCache } from "../../common/service/cashe.service.js";
import { randomInt } from "node:crypto";
import { buildEmailHtml } from "../../common/utils/mail.templates.js";

export const signup = async (data) => {
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
  data.phone = await encryptData({ plainText: data.phone });

  const user = await userRepo.create({ data });

  const otp = randomInt(100000, 1000000).toString();
  await setCache({ key: `otp:${data.email}`, value: otp, ttl: 600 });

  await sendMail({
    to: data.email,
    subject: "Your verification code",
    text: `Verification code: ${otp}. Valid for 10 minutes.`,
    html: buildEmailHtml({
      appName: "Saraha",
      title: "Email confirmation",
      greeting: `Hi ${data.firstName},`,
      message:
        "Use the following code to verify your account. The code is valid for 10 minutes.",
      otp,
      note: "If you didn't request the code, ignore this message.",
      dir: "ltr",
    }),
  });

  return user;
};



export const login = async (data) => {
    let userExists = await userRepo.findOne({filter: {email : data.email}})
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