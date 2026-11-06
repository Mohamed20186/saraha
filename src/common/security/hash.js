import { hash, compare, genSalt } from "bcrypt";
import configService from "../../config/config.service.js";
import argon2 from "argon2";
const saltRounds = configService.bcryptSaltRounds;
import { hashEnum } from "../enums/hash.enum.js";

export const hashPassword = async ({
  plainText,
  minor = "b",
  lib = hashEnum.bcrypt,
}) => {
  if (typeof plainText !== "string" || !plainText.length) {
    throw new TypeError("Password must be a non-empty string");
  }
  switch (lib) {
    case hashEnum.bcrypt:
      let salt = await genSalt(saltRounds, minor);
      let rerult = await hash(plainText, salt);
      return rerult;
      break;
    case hashEnum.argon:
      return await argon2.hash(plainText);
      break;
  }
};

export const comparePassword = async ({
  plainText,
  hashedPassword,
  lib = hashEnum.bcrypt,
}) => {
  if (typeof plainText !== "string" || typeof hashedPassword !== "string") {
    throw new TypeError("Invalid password data");
  }
  switch (lib) {
    case hashEnum.bcrypt:
      return await compare(plainText, hashedPassword);
      break;
    case hashEnum.argon:
      return await argon2.verify(hashedPassword, plainText);
      break;
  }
};
