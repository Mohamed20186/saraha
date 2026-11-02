import { Router } from "express";


export const authController = Router();


authController.post("/signup",async(req,res,next)=>{
    let user = await as.signup(req.body)
})