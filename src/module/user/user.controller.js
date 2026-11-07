import { Router } from "express";
import * as us from "./user.services.js";
import { response } from "../../common/index.js";
import { authenticate } from "../../common/middleware/auth.middleware.js";

export const userController = Router();

userController.get("/profile", authenticate, async (req, res, next) => {
  try {
    const user = await us.profile(req.auth.sub);

    response({
      res,
      data: user,
      statusCode: 200,
      message: "Profile retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
});

userController.patch("/profile", authenticate, async (req, res, next) => {
  try {
    const user = await us.updateUser(req.auth.sub, req.body);

    response({
      res,
      data: user,
      statusCode: 200,
      message: "Profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
});