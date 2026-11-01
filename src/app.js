
import express from "express";
import { errorHandler } from "./common/index.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Saraha API",
  });
});

app.use(errorHandler);

export default app;
