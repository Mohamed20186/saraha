import { User } from "../../database/models/user.model.js";
import { userRepo } from "../../repo/user.repo.js";
import { exceptions } from "../../common/exceptions/index.js";
import { encryptData } from "../../common/security/encryption.js";

// Get user by ID
export const getUserById = async (userId) => {
  const user = await userRepo.findById({id:userId,projection : {password:0}});

  if (!user) {
    throw exceptions.notFound("User not found");
  }

  return user;
};

export const profile = async (userId) => {
  return await getUserById(userId);
};

// Public profile by ID: never expose email or phone.
export const getPublicProfile = async (userId) => {
  const user = await userRepo.findById({
    id: userId,
    projection: { password: 0, email: 0, phone: 0 },
  });

  if (!user) {
    throw exceptions.notFound("User not found");
  }

  return user;
};



export const updateUser = async (userId, data) => {
  const user = await getUserById(userId);

  const allowedFields = ["firstName", "lastName"];

  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      user[key] = data[key];
    }
  }

  if (data.phone !== undefined) {
    user.phone = encryptData({ plainText: data.phone });
  }

  await user.save();

  return user;
};
