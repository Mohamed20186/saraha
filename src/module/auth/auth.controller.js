import { Router } from "express";
import * as as from "./auth.services.js";
import { response } from "../../common/index.js";

export const authController = Router();

authController.post("/signup", async (req, res, next) => {
 try {
     const user = await as.signup(req.body);
     response({
       res,
       data: user,
       statusCode: 201,
       message: "user created successfully........",
     });
 } catch (error) {
    next(error)
 }
});


authController.post("/login", async (req, res, next) => {
 try {
      let user = await as.login(req.body);
     response({
       res,
       data: user,
       statusCode: 200,
       message: "user logged",
     });
 } catch (error) {
    next(error)
 }
});
