import crypto from "node:crypto";
import configService from "../../config/config.service.js";
const AUTH_TAG_LENGTH = 16;
const VERSION = "v1";

const getEncryptionKey = () => {
  const key = Buffer.from(configService.ENC_KEY || "", "base64");
  if (key.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }
  return key;
};


export const encryptData = ({plainText })=>{
if (typeof plainText !== "string") {
    throw new TypeError("Data must be a string");
  }
   const key = getEncryptionKey();
   const iv = crypto.randomBytes(configService.ENC_IV_LENGTH);
   const cipher = crypto.createCipheriv(configService.ALGORITHM, key, iv);
   let result = cipher.update(plainText,"utf-8","hex")
   result += cipher .final('hex')
   return `${iv.toString("hex")}::${result}` ;
}