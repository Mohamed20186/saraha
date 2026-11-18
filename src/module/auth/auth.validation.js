
import { z } from "zod";
import { gender } from "../../common/enums/gender.enum.js";
const genderValues = Object.values(gender).filter(
  (value) => typeof value === "number"
);
export const loginBodySchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8),
});
export const signupBodySchema = loginBodySchema.safeExtend({
  firstName: z.string().trim().min(3).max(50),

  lastName: z.string().trim().min(3).max(50),

  phone: z.string().trim().optional(),

  gender: z
    .number()
    .int()
    .refine((value) => genderValues.includes(value), {
      error: "Invalid gender",
    })
    .optional(),

  confirmPassword: z.string().min(8),
}).superRefine((data, ctx) => {

  // Password Confirmation
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });
  }

  if (
    data.phone !== undefined &&
    !/^01[0125]\d{8}$/.test(data.phone)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Invalid Egyptian phone number",
      path: ["phone"],
    });
  }

 
  if (!/[A-Z]/.test(data.password)) {
    ctx.addIssue({
      code: "custom",
      message: "Password must contain at least one uppercase letter",
      path: ["password"],
    });
  }
  if (!/[a-z]/.test(data.password)) {
    ctx.addIssue({
      code: "custom",
      message: "Password must contain at least one lowercase letter",
      path: ["password"],
    });
  }
  if (!/\d/.test(data.password)) {
    ctx.addIssue({
      code: "custom",
      message: "Password must contain at least one number",
      path: ["password"],
    });
  }

  if (!/[^A-Za-z0-9\s]/.test(data.password)) {
    ctx.addIssue({
      code: "custom",
      message: "Password must contain a special character",
      path: ["password"],
    });
  }
  const normalizedPassword = data.password.toLowerCase();
  if (
    normalizedPassword.includes(data.firstName.toLowerCase()) ||
    normalizedPassword.includes(data.lastName.toLowerCase())
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Password must not contain your name",
      path: ["password"],
    });
  }

});

export const loginSchema = z.object({
  body: loginBodySchema,
});
export const signupSchema = z.object({
  body: signupBodySchema,
});
