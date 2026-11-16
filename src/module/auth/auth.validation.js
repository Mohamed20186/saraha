import { z } from "zod";
import { gender } from "../../common/enums/gender.enum.js";

export const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8),
});

const genderValues = Object.values(gender).filter(
  (value) => typeof value === "number"
);

export const signupSchema = loginSchema.extend({
  firstName: z.string().trim().min(3).max(50),

  lastName: z.string().trim().min(3).max(50),

  phone: z.string().trim().optional(),

  gender: z.number()
    .int()
    .refine((value) => genderValues.includes(value), {
      message: "Invalid gender",
    })
    .optional(),
});