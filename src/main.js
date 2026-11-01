import express from "express"
import configService from "./config/config.service.js";
const app = express();
const port = configService.port


app.get("/",(req,res,next)=>{
    res.status(200).json({
        message : "hello world"
    })
})


app.listen(port,()=>{
    console.log(`server is running on port ${port}`)
})
 
 