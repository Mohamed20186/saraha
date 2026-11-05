import { Router } from "express";
import * as as from "./auth.services.js";
import { response } from "../../common/index.js";

export const authController = Router();

authController.post("/signup", async (req, res, next) => {
  let user = await as.signup(req.body);
  response({
    res,
    data: user,
    statusCode: 201,
    message: "user created successfully........",
  });
});
