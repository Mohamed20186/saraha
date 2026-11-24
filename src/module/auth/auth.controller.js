import { Router } from "express";
import * as as from "./auth.services.js";
import { response } from "../../common/index.js";
import { authenticate } from "../../common/middleware/authentication.middleware.js";
import { TokenType } from "../../common/enums/tokenType.enum.js";
import {
  loginSchema,
  signupSchema,
  logoutSchema,
  confirmEmailSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation.js";
import { validation } from "../../common/middleware/index.js";
import { AUTH_ENUM } from "../../common/index.js";

export const authController = Router();

authController.post("/signup", validation(signupSchema), async (req, res, next) => {
  try {
    const user = await as.signup(req.validate.body);
    response({
      res,
      data: user,
      statusCode: 201,
      message: req.t("auth.signup.success"),
    });
  } catch (error) {
    next(error);
  }
});

authController.post("/login",validation(loginSchema), async (req, res, next) => {
  try {
    const user = await as.login(req.validate.body);
    response({
      res,
      data: user,
      statusCode: 200,
      message: req.t("auth.login.success"),
    });

  } catch (error) {
    next(error);
  }
});


authController.post(
  "/confirm-email",
  validation(confirmEmailSchema),
  async (req, res, next) => {
    try {
      await as.confirmEmail(req.validate.body);
      response({
        res,
        data: null,
        statusCode: 200,
        message: req.t("auth.confirmEmail.success"),
      });
    } catch (error) {
      next(error);
    }
  },
);

authController.post(
  "/resend-otp",
  validation(resendOtpSchema),
  async (req, res, next) => {
    try {
      await as.resendOtp(req.validate.body);
      response({
        res,
        data: null,
        statusCode: 200,
        message: req.t("auth.resendOtp.success"),
      });
    } catch (error) {
      next(error);
    }
  },
);

authController.post(
  "/rotate-token",
  authenticate({ tokenType: TokenType.refreshTokenType }),
  async (req, res, next) => {
    try {
      let user = await as.rotateToken(req.token);
      response({
        res,
        data: user,
        statusCode: 200,
        message: req.t("auth.rotateToken.success"),
      });
    } catch (error) {
      next(error);
    }
  },
);

authController.post(
  "/logout",
  authenticate({
    tokenType: TokenType.refreshTokenType,
    allowedSchemes: [AUTH_ENUM.BEARER],
  }),
  validation(logoutSchema),
  async (req, res, next) => {
    try {
      await as.logout({
        userId: req.auth.sub,
        logoutType: req.validate.body.logoutType,
      });

      return response({
        res,
        data: null,
        statusCode: 200,
        message: req.t("auth.logout.success"),
      });
    } catch (error) {
      next(error);
    }
  },
);

authController.post(
  "/forgot-password",
  validation(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      await as.forgotPassword(req.validate.body);
      response({
        res,
        data: null,
        statusCode: 200,
        message: req.t("auth.forgotPassword.success"),
      });
    } catch (error) {
      next(error);
    }
  },
);

authController.post(
  "/reset-password",
  validation(resetPasswordSchema),
  async (req, res, next) => {
    try {
      await as.resetPassword(req.validate.body);
      response({
        res,
        data: null,
        statusCode: 200,
        message: req.t("auth.resetPassword.success"),
      });
    } catch (error) {
      next(error);
    }
  },
);
