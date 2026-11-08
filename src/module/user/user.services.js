import { User } from "../../database/models/user.model.js";

// Get user by ID
const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");

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