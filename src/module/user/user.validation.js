import mongoose from "mongoose";
import z from "zod";

export const userProfileSchema = z.object({
    params : z.strictObject({
        userId : z.string().length(24)
    }).refine(({userId})=>{
        mongoose.isValidObjectId(userId)
    },{
        error : "invalid objectId",
        path : ['params','userId']
    })
})