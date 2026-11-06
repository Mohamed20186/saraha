import dotenv from "dotenv";
import {resolve} from "path" ; 

const envFilePath = resolve(process.cwd(),`.env.${process.env.NODE_ENV}`)

dotenv.config({
    path : envFilePath
})


export default {
    port : Number( process.env.PORT || 3000 ), 
    db_url : process.env.DB_URL , 
    bcryptSaltRounds : Number(process.env.BCRYPT_SALT_ROUNDS || 10)
}