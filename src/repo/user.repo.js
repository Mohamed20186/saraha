
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
