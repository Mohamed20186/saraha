import { Router } from "express";
import * as us from "./user.services.js";
import { response } from "../../common/index.js";
import { authenticate } from "../../common/middleware/authentication.middleware.js";
import { TokenType } from "../../common/enums/tokenType.enum.js";
import { authorize } from "../../common/middleware/authorization.middleware.js";
import { ROLE } from "../../common/enums/role.enum.js";
import { validation } from "../../common/middleware/validation.middleware.js";
import { userProfileSchema, updateProfileSchema } from "./user.validation.js";

export const userController = Router();

userController.get("/profile", authenticate({tokenType : TokenType.accessTokenType}), async (req, res, next) => {
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

userController.get(
  "/admin-profile",
  authenticate({ tokenType: TokenType.accessTokenType }),
  authorize(ROLE.ADMIN),
  async (req, res, next) => {
    try {
      const user = await us.profile(req.auth.sub);

      response({
        res,
        data: user,
        statusCode: 200,
        message: "Admin profile retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

userController.patch("/profile", authenticate({tokenType : TokenType.accessTokenType}), validation(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await us.updateUser(req.auth.sub, req.validate.body);

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

userController.get("/user-profile/:userId", validation(userProfileSchema) , async (req, res, next) => {
  try {
    const user = await us.getPublicProfile(req.validate.params.userId);
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
