
import mongoose from "mongoose";
import configService from "../config/config.service.js";
import { client } from "./redis.connection.js";

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection lost!");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB runtime error:", error.message);
});

const dbConnection = async () => {
  try {
    console.log("Connecting to MongoDB...");

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(configService.db_url, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      });

      await mongoose.syncIndexes();
    }

    console.log("MongoDB connected successfully!");

    if (!client.isOpen) {
      await client.connect();
    }


    return mongoose.connection;

  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
};

export const closeDBConnection = async () => {
  try {
    if (client.isOpen) {
      await client.close();
      console.log("Redis connection closed.");
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    }

  } catch (error) {
    console.error("Failed to close connections:", error.message);
    throw error;
  }
};

export default dbConnection;