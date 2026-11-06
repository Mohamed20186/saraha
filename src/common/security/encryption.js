import crypto from "node:crypto";
import configService from "../../config/config.service.js";

const AUTH_TAG_LENGTH = 16;
const VERSION = "v1";
const IV_LENGTH = 12;

const getEncryptionKey = () => {
  const key = Buffer.from(configService.ENC_KEY || "", "base64");

  if (key.length !== 32) {
    throw new Error("Encryption key must be 32 bytes");
  }

  return key;
};

// Encryption
export const encryptData = ({ plainText }) => {
  if (typeof plainText !== "string") {
    throw new TypeError("Data must be a string");
  }

  const key = getEncryptionKey();

  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(
    configService.ALGORITHM,
    key,
    iv,
    { authTagLength: AUTH_TAG_LENGTH }
  );

  let result = cipher.update(plainText, "utf-8", "hex");

  result += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${VERSION}::${iv.toString("hex")}::${authTag.toString("hex")}::${result}`;
};


export const decryptData = ({ encryptedText }) => {
  if (typeof encryptedText !== "string") {
    throw new TypeError("Encrypted data must be a string");
  }

  const [version, ivHex, authTagHex, encrypted] =
    encryptedText.split("::");

  if (
    version !== VERSION ||
    !ivHex ||
    !authTagHex ||
    encrypted === undefined
  ) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH ||
    !/^(?:[0-9a-f]{2})*$/i.test(encrypted)
  ) {
    throw new Error("Invalid encrypted data format");
  }

  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    configService.ALGORITHM,
    key,
    iv,
    { authTagLength: AUTH_TAG_LENGTH }
  );

  decipher.setAuthTag(authTag);

  let result = decipher.update(encrypted, "hex", "utf-8");

  result += decipher.final("utf-8");

  return result;
};