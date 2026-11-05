import { Router } from "express";
import * as as from "./auth.services.js"

export const authController = Router();


authController.post("/signup",async(req,res,next)=>{
    let user = await as.signup(req.body)
})