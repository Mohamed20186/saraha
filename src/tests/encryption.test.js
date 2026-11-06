import test from "node:test";
import assert from "node:assert/strict";

import {
  encryptData,
  decryptData
} from "../common/security/encryption.js";


// Test 1: Encryption and Decryption
test("Should encrypt and decrypt data correctly", () => {

  const plainText = "mohamed ahmed abd-elrahim";

  const encryptedText = encryptData({ plainText });

  const decryptedText = decryptData({ encryptedText });

  assert.notEqual(encryptedText, plainText);

  assert.equal(decryptedText, plainText);

});


// Test 2: Every encryption should generate different output
test("Should generate different ciphertext for same text", () => {

  const plainText = "Mohamed";

  const encrypted1 = encryptData({ plainText });
  const encrypted2 = encryptData({ plainText });

  assert.notEqual(encrypted1, encrypted2);

});


// Test 3: Should reject modified encrypted data
test("Should reject tampered encrypted data", () => {

  const encryptedText = encryptData({
    plainText: "Mohamed"
  });

  const [version, iv, tag, content] = encryptedText.split("::");

  const modifiedContent =
    content.slice(0, -2) +
    (content.slice(-2) === "00" ? "01" : "00");

  const tamperedText =
    `${version}::${iv}::${tag}::${modifiedContent}`;

  assert.throws(() => {
    decryptData({ encryptedText: tamperedText });
  });

});