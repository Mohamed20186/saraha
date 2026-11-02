
import mongoose from "mongoose";
import configService from "../config/config.service.js";

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection lost!");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB runtime error:", error.message);
});

const dbConnection = async () => {
  try {
    console.log("Connecting to MongoDB...");

    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB is already connected.");
      return mongoose.connection;
    }

    await mongoose.connect(configService.db_url, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    await mongoose.syncIndexes()
    console.log("MongoDB connected successfully!");
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);

    return mongoose.connection;

  } catch (error) {
    console.error("MongoDB connection failed!");
    console.error(error.message);

    throw error;
  }
};

export const closeDBConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed successfully.");
  } catch (error) {
    console.error("Failed to close MongoDB connection:", error.message);
    throw error;
  }
};

export default dbConnection;
