import { exceptions } from "../../common/exceptions/index.js";
import { User } from "../../database/index.js";


export const signup = async (data)=>{
 let userExists = await User.findOne({email : data.email})  
 if(userExists) {
    throw exceptions.conflict("user already exists")
 }
 return await User.create(data);
}

export const login = async (data)=>{
 let userExists = await User.findOne({email : data.email, password : data.password})  
 if(!userExists){
    throw exceptions.notFound("Invalid email or password")
 }  
 return userExists ; 
}
