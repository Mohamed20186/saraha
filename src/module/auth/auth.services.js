import { User } from "../../database/index.js";
export const signup = async (data)=>{
 return await User.create(data);
}
