
import { client } from "../../database/connections/redis.connection.js";

const getRevokedTokenKey = ({ jti }) => {
  return `auth:revoked:${jti}`;
};

// Check if token is revoked
export const isTokenRevoked = async ({ jti }) => {
  return (await client.exists(getRevokedTokenKey({ jti }))) > 0;
};

// Revoke token
export const revokeToken = async ({ jti, exp }) => {
  if (!jti || !Number.isInteger(exp)) {
    throw new TypeError("Valid jti and exp are required");
  }

  const ttl = exp - Math.floor(Date.now() / 1000);

  if (ttl <= 0) {
    return false;
  }

  const result = await client.set(
    getRevokedTokenKey({ jti }),
    "1",
    { EX: ttl, NX: true }
  );

  return result === "OK";
};