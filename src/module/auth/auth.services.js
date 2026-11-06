import { exceptions } from "../../common/exceptions/index.js";
import { hashEnum, security } from "../../common/index.js";
import { User } from "../../database/index.js";

export const signup = async (data) => {
  let userExists = await User.findOne({ email: data.email });
  if (userExists) {
    throw exceptions.conflict("user already exists");
  }
  data.password = await security.hashPassword({ plainText: data.password , lib : hashEnum.argon });
  return await User.create(data);
};

export const login = async (data) => {
  let userExists = await User.findOne({ email: data.email });
  if (!userExists) {
    throw exceptions.notFound("Invalid email or password");
  }
  const plainTextPass = await security.comparePassword({
    plainText: data.password,
    hashedPassword: userExists.password,
  });
  if (!plainTextPass) {
    throw exceptions.notFound("Invalid email or password");
  }
  return userExists;
};
