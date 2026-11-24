
import { User } from "../database/models/user.model.js";
import createRepository from "../repo/index.js";

// Create User Repository
export const userRepo = createRepository(User);



export const findUserByEmail = async ({
    email,
    projection = null,
    options = {},
}) => {
    return userRepo.findOne({
        filter: {
            email: email.trim().toLowerCase(),
        },
        projection,
        options,
    });
};


export const findUsersByRole = async ({
    role,
    projection = null,
    options = {},
}) => {
    return userRepo.find({
        filter: { role },
        projection,
        options,
    });
};


export const findUsersByName = async ({
    name,
    projection = null,
    options = {},
}) => {
    const search = name.trim();

    return userRepo.find({
        filter: {
            $or: [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
            ],
        },
        projection,
        options,
    });
};

export const incrementTokenVersion = async ({ id }) => {
  return User.updateOne(
    { _id: id },
    {
      $inc: {
        tokenVersion: 1,
      },
    },
  );
};

// Atomic password change for the reset flow. Matches only while the stored
// hash is still the one the caller checked, so two concurrent writers cannot
// overwrite each other, and bumps tokenVersion with $inc (no lost update
// against a concurrent logout-all). Returns true when a document changed.
export const resetUserPassword = async ({ id, oldPasswordHash, newPasswordHash }) => {
  const result = await User.updateOne(
    { _id: id, password: oldPasswordHash },
    { $set: { password: newPasswordHash }, $inc: { tokenVersion: 1 } },
  );
  return result.modifiedCount === 1;
};
