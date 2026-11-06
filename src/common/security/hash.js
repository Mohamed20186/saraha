import { hash, compare , genSalt } from "bcrypt";
import configService from "../../config/config.service.js";

const saltRounds = configService.bcryptSaltRounds;

export const hashPassword = async ({ plainText , minor = "b" }) => {
  if (typeof plainText !== "string" || !plainText.length) {
    throw new TypeError("Password must be a non-empty string");
  }
  console.log()
  let salt = await genSalt(saltRounds,minor)
  let rerult =  await hash(plainText, salt);
  return rerult
};

export const comparePassword = async ({ plainText, hashedPassword }) => {
  if (typeof plainText !== "string" || typeof hashedPassword !== "string") {
    throw new TypeError("Invalid password data");
  }
  return await compare(plainText, hashedPassword);
};
