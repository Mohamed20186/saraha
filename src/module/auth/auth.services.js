import { exceptions } from "../../common/exceptions/index.js";
import { User } from "../../database/index.js";


export const signup = async (data)=>{
 let userExists = await User.findOne({email : data.email})  
 if(userExists) exceptions.conflict("user already exists")
 return await User.create(data);
}
