import { Router } from "express";
import { response } from "../../common/index.js";
import * as ms from "./message.services.js"
export const messageController = Router();


messageController.post("/", async (req, res, next) => {
    try {
       const data = await ms.createMessage(req.validate.body)

        response({ res, message: "Message created", data: data, })

    } catch (err) {
        next(err)
    }
})
