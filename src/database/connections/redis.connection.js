import { createClient } from "redis";
import configService from "../../config/config.service.js";

export const client = createClient({
  url: configService.REDIS_URI,
});

client.on("error", (error) => {
  console.error("Redis Client Error:", error.message);
});

client.on("connect", () => {
  console.log("Connecting to Redis...");
});

client.on("ready", () => {
  console.log("Redis connected successfully!");
});

client.on("reconnecting", () => {
  console.warn("Redis reconnecting...");
});