
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import configService from "../../config/config.service.js";
import { TokenType } from "../enums/tokenType.enum.js";
import { ROLE } from "../enums/role.enum.js";


// ==========================================
// Create Access & Refresh Tokens
// ==========================================

export const createToken = ({
  payload = {},
  accessOptions = {},
  refreshOptions = {},
  role = ROLE.USER,
}) => {
  const secrets = getRoleSecret(role);

  const tokenPayload = {
    ...payload,
    role,
  };

  const accessToken = jwt.sign(
    {
      ...tokenPayload,
      jti: randomUUID(),
    },
    secrets.access,
    {
      expiresIn: configService.ACCESS_EXPIRES_IN,
      algorithm: configService.TOKEN_ALGORITHM,
      ...accessOptions,
    }
  );

  const refreshToken = jwt.sign(
    {
      ...tokenPayload,
      jti: randomUUID(),
    },
    secrets.refresh,
    {
      expiresIn: configService.REFRESH_EXPIRES_IN,
      algorithm: configService.TOKEN_ALGORITHM,
      ...refreshOptions,
    }
  );

  return {
    accessToken,
    refreshToken,
  };
};


// ==========================================
// Get Secrets Based On User Role
// ==========================================

const getRoleSecret = (role) => {
  const secrets = {
    [ROLE.ADMIN]: {
      access: configService.JWT_ACCESS_ADMIN_SECRET,
      refresh: configService.JWT_REFRESH_ADMIN_SECRET,
    },

    [ROLE.USER]: {
      access: configService.JWT_ACCESS_USER_SECRET,
      refresh: configService.JWT_REFRESH_USER_SECRET,
    },
  };

  const selectedSecret = secrets[role];

  if (!selectedSecret) {
    throw new Error("Invalid user role");
  }

  return selectedSecret;
};


// ==========================================
// Get Secret Based On Token Type
// ==========================================

const getSecret = ({ tokenType, role }) => {
  const secrets = getRoleSecret(role);

  switch (tokenType) {
    case TokenType.accessTokenType:
      return secrets.access;

    case TokenType.refreshTokenType:
      return secrets.refresh;

    default:
      throw new Error("Invalid token type");
  }
};


// ==========================================
// Verify JWT
// ==========================================

export const verifyToken = ({
  token,
  tokenType = TokenType.accessTokenType,
}) => {
  const decoded = jwt.decode(token);

  if (
    !decoded ||
    typeof decoded !== "object" ||
    Array.isArray(decoded) ||
    !Object.values(ROLE).includes(decoded.role)
  ) {
    throw new Error("Invalid token payload");
  }

  const secret = getSecret({
    tokenType,
    role: decoded.role,
  });

  const verifiedPayload = jwt.verify(token, secret, {
    algorithms: [configService.TOKEN_ALGORITHM],
  });

  return verifiedPayload;
};