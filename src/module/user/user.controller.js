import { Router } from "express";
import * as us from "./user.services.js";
import { response } from "../../common/index.js";

export const userController = Router();

userController.get("/profile", async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

        if (!token) {
            return response({
                res,
                data: null,
                statusCode: 401,
                message: "Authorization token is required",
            });
        }

        const user = await us.profile(token);

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


userController.patch("/profile", async (req, res, next) => {
  try {
    const user = await updateUser(token, req.body);

    response({
      res,
      data: user,
      message: "Profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
});
