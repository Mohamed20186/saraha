import { exceptions } from "../../common/exceptions/index.js";
import { hashEnum, security } from "../../common/index.js";
import { encryptData } from "../../common/security/encryption.js";
import { User } from "../../database/index.js";
import jwt from "jsonwebtoken";
import configService from "../../config/config.service.js";
import { createToken , verifyToken } from "../../common/security/index.js";
import { TokenType } from "../../common/enums/tokenType.enum.js";


export const signup = async (data) => {
  let userExists = await User.findOne({ email: data.email });
  if (userExists) {
    throw exceptions.conflict("user already exists");
  }
  data.password = await security.hashPassword({ plainText: data.password , lib : hashEnum.argon });
  data.phone = await encryptData({plainText:data.phone})
  return await User.create(data);
};

export const login = async (data) => {
  let userExists = await User.findOne({ email: data.email });
  if (!userExists) {
    throw exceptions.notFound("Invalid email or password");
  }
  const plainTextPass = await security.comparePassword({
    plainText: data.password,
    hashedPassword: userExists.password,
    lib : hashEnum.argon
  });
  if (!plainTextPass) {
    throw exceptions.notFound("Invalid email or password");
  }
  const token= createToken({accessOptions : {
    subject : userExists.id ,
    issuer : "mohamed",
    audience : ["admin , users"]
  },
  refreshOptions : {
    subject : userExists.id ,
    issuer : "RAhim",
    audience : ["admin"] 
  },

})
  return token;
};

export const rotateToken = (refreshToken) => {
  const decoded = verifyToken({
    token: refreshToken,
    tokenType: TokenType.refreshTokenType,
  });

  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Invalid refresh token payload");
  }
  let accessIAT = decoded.iat * 1000
  let accessExpIn = configService.ACCESS_EXPIRES_IN * 1000
  let accessExpAt = accessIAT + accessExpIn
  let currTime = Date.now()
  if( currTime < accessExpAt){
    throw exceptions.conflict("access token still valid")
  }

  // return {
  //   accessIAT ,
  //   accessExpIn ,
  //   accessExpAt ,
  //   currTime ,
  // }
  return createToken({
    accessOptions: {
      subject: decoded.sub,
    },
    refreshOptions: {
      subject: decoded.sub,
    },
  });
};