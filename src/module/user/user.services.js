import { User } from "../../database/models/user.model.js";
import { userRepo } from "../../repo/user.repo.js";
// Get user by ID
export const getUserById = async (userId) => {
  const user = await userRepo.findById({id:userId,projection : {password:0}});

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const profile = async (userId) => {
  return await getUserById(userId);
};



export const updateUser = async (userId, data) => {
  const user = await getUserById(userId);

  const allowedFields = ["firstName", "lastName", "phone"];

  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      user[key] = data[key];
    }
  }

  await user.save();

  return user;
};