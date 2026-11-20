import { z } from "zod";

const generalFields = {
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),

  strongPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/\d/, "Password must contain a number")
    .regex(
      /[^A-Za-z0-9\s]/,
      "Password must contain a special character"
    ),

  firstName: z.string().trim().min(3).max(50),

  lastName: z.string().trim().min(3).max(50),

  egyptianPhone: z
    .string()
    .trim()
    .regex(/^01[0125]\d{8}$/, "Invalid Egyptian phone number"),

  email: z.email(),
};

export default generalFields;