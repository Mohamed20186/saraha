import jwt from "jsonwebtoken"
import { User } from "../../database/models/user.model.js"
import configService from "../../config/config.service.js";
import { verifyToken } from "../../common/security/index.js";


export const profile = async (token) => {

    const decoded = verifyToken({token})

    if (!decoded?.sub) {
        throw new Error("Invalid token");
    }

    const user = await User.findById(decoded.sub)
        .select("-password");

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}