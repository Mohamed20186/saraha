import { client } from "../../database/connections/redis.connection.js";

export const setCache = async ({ key, value, ttl = 60 }) => {
  const serializedValue = JSON.stringify(value);

  if (serializedValue === undefined) {
    throw new TypeError("Cache value cannot be undefined");
  }

  if (ttl !== null && (!Number.isInteger(ttl) || ttl < 1)) {
    throw new TypeError("TTL must be a positive integer or null");
  }

  if (ttl === null) {
    return await client.set(key, serializedValue);
  }

  return await client.set(key, serializedValue, {
    EX: ttl,
  });
};

export const getCache = async ({ key }) => {
  const cachedData = await client.get(key);

  if (cachedData === null) {
    return undefined;
  }

  try {
    return JSON.parse(cachedData);
  } catch {
    return cachedData;
  }
};

export const deleteCache = async ({ key }) => {
  return await client.del(key);
};

export const deleteManyCache = async ({ keys }) => {
  if (!keys.length) return 0;

  return await client.del(keys);
};

export const existsCache = async ({ key }) => {
  return (await client.exists(key)) > 0;
};

export const expireCache = async ({ key, ttl }) => {
  return await client.expire(key, ttl);
};

export const getCacheTTL = async ({ key }) => {
  return await client.ttl(key);
};

export const incrementCache = async ({ key, amount = 1 }) => {
  return await client.incrBy(key, amount);
};

export const decrementCache = async ({ key, amount = 1 }) => {
  return await client.decrBy(key, amount);
};

export const getOrSetCache = async ({
  key,
  fetchData,
  ttl = 60,
}) => {
  const cachedData = await getCache({ key });

  if (cachedData !== undefined) {
    return cachedData;
  }

  const freshData = await fetchData();

  await setCache({
    key,
    value: freshData,
    ttl,
  });

  return freshData;
};