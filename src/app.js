
import express from "express";
import { errorHandler } from "./common/index.js";
import { authController } from "./module/auth/auth.controller.js";

const app = express();

app.use(express.json());
app.use("/auth",authController)

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Saraha API",
  });
});

app.use(errorHandler);

export default app;
