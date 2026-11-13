
import jwt from "jsonwebtoken";
import configService from "../../config/config.service.js";
import { TokenType } from "../enums/tokenType.enum.js";
import { ROLE } from "../enums/role.enum.js";

export const createToken = ({
  payload = {},
  accessOptions = {},
  refreshOptions = {},
  role = ROLE.USER
}) => {
  const secrets = getRoleSecret(role)
  const tokenPayload = {
    ...payload,
    role
  };

  const accessToken = jwt.sign(
    tokenPayload,
    secrets.access,
    {
      expiresIn: configService.ACCESS_EXPIRES_IN,
      algorithm: configService.TOKEN_ALGORITHM,
      ...accessOptions,
    }
  );

  const refreshToken = jwt.sign(
    tokenPayload,
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



const getRoleSecret = (role) => {

  const secrets = {
    [ROLE.ADMIN]: {
      access: configService.JWT_ACCESS_ADMIN_SECRET,
      refresh: configService.JWT_REFRESH_ADMIN_SECRET
    },

    [ROLE.USER]: {
      access: configService.JWT_ACCESS_USER_SECRET,
      refresh: configService.JWT_REFRESH_USER_SECRET
    }
  };

  const selectedSecret = secrets[role];

  if (!selectedSecret) {
    throw new Error("Invalid user role");
  }

  return selectedSecret;
};



const getSecret = ({tokenType, role}) => {
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





export const verifyToken = ({
  token,
  tokenType = TokenType.accessTokenType
}) => {
  const decoded = jwt.decode(token);

  if (
    !decoded ||
    typeof decoded !== "object" ||
    !Object.values(ROLE).includes(decoded.role)
  ) {
    throw new Error("Invalid token payload");
  }

  const secret = getSecret({tokenType : tokenType, role : decoded.aud[0]});

  return jwt.verify(token, secret, {
    algorithms: [configService.TOKEN_ALGORITHM]
  });
};
