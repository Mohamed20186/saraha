import dotenv from "dotenv";
import {resolve} from "path" ; 

const envFilePath = resolve(process.cwd(),`.env.${process.env.NODE_ENV}`)

dotenv.config({
    path : envFilePath
})


export default {
    port : Number( process.env.PORT || 3000 ), 
    db_url : process.env.DB_URL , 
    bcryptSaltRounds : Number(process.env.BCRYPT_SALT_ROUNDS || 10),
    ENC_KEY : process.env.ENC_KEY,
    ENC_IV_LENGTH : Number(process.env.ENC_IV_LENGTH || 16),
    ALGORITHM : process.env.ALGORITHM ,
    JWT_ACCESS_SECRET : process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET : process.env.JWT_REFRESH_SECRET,
    TOKEN_ALGORITHM : process.env.TOKEN_ALGORITHM,
    ACCESS_EXPIRES_IN : process.env.ACCESS_EXPIRES_IN,
     REFRESH_EXPIRES_IN : process.env.REFRESH_EXPIRES_IN
}

