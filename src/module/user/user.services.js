import jwt from "jsonwebtoken";
import { User } from "../../database/models/user.model.js";
import configService from "../../config/config.service.js";
import { verifyToken } from "../../common/security/index.js";

const getAuthenticatedUser = async (token) => {
  const decoded = verifyToken({ token });

  if (!decoded?.sub) {
    throw new Error("Invalid token");
  }

  const user = await User.findById(decoded.sub).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const profile = async (token) => {
   return await getAuthenticatedUser(token)
};



export const updateUser = async (token, data) => {
  const user = await getAuthenticatedUser(token);
  const allowedFields = ["firstName", "lastName", "phone"];
  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      user[key] = data[key];
    }
  }
  await user.save();
   return user;

};
