import jwt from "jsonwebtoken";
import configService from "../../config/config.service.js";
import { TokenType } from "../enums/tokenType.enum.js";

export const createToken = ({
  payload = {},
  accessOptions = {},
  refreshOptions = {},
}) => {
  const accessSecret = configService.JWT_ACCESS_SECRET;
  const refreshSecret = configService.JWT_REFRESH_SECRET;
  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: configService.ACCESS_EXPIRES_IN,
    algorithm: configService.TOKEN_ALGORITHM,
    ...accessOptions,
  });
  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: configService.REFRESH_EXPIRES_IN,
    algorithm: configService.TOKEN_ALGORITHM,
    ...refreshOptions,
  });
  return {
    accessToken,
    refreshToken,
  };
};

const getSecret = (tokenType)=>{
    return tokenType == TokenType.accessTokenType ? configService.JWT_ACCESS_SECRET : configService.JWT_REFRESH_SECRET
}

export const verifyToken = ({ token, tokenType = TokenType.accessTokenType }) => {
  const secret = getSecret(tokenType)
  return jwt.verify(token, secret);
};
