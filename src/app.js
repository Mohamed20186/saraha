
import express from "express";
import { errorHandler } from "./common/index.js";
import { authController } from "./module/auth/auth.controller.js";
import { userController } from "./module/user/user.controller.js";
import i18nMiddleware from "./config/i18n.config.js";
import { messageController } from "./module/index.js";

const app = express();

app.use(express.json());
app.use(i18nMiddleware);
app.use("/uploads", express.static("uploads"));

app.use("/auth",authController)
app.use("/user",userController)
app.use("/message", messageController)
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Saraha API",
  });
});

app.use(errorHandler);

export default app;
