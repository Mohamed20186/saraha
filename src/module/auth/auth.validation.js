import { z } from "zod";
import { gender } from "../../common/enums/gender.enum.js";
import gf from "../../common/utils/generalFildes.js";

const genderValues = Object.values(gender).filter(
  (value) => typeof value === "number"
);

// Login Body Schema
export const loginBodySchema = (t) => {
  const fields = gf(t);

  return z.strictObject({
    email: fields.email,
    password: fields.password,
  });
};

// Signup Body Schema
export const signupBodySchema = (t) => {
  const fields = gf(t);

  return loginBodySchema(t)
    .safeExtend({
      password: fields.strongPassword,

      firstName: fields.firstName,

      lastName: fields.lastName,

      phone: fields.egyptianPhone.optional(),

      gender: z
        .number()
        .int()
        .refine((value) => genderValues.includes(value), {
          error: t("validation.invalidGender"),
        })
        .optional(),

      confirmPassword: fields.password,
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: t("validation.passwordMismatch"),
          path: ["confirmPassword"],
        });
      }

      const normalizedPassword = data.password.toLowerCase();

      if (
        normalizedPassword.includes(data.firstName.toLowerCase()) ||
        normalizedPassword.includes(data.lastName.toLowerCase())
      ) {
        ctx.addIssue({
          code: "custom",
          message: t("validation.passwordContainsName"),
          path: ["password"],
        });
      }
    });
};

// Complete Schemas
export const loginSchema = (t) =>
  z.object({
    body: loginBodySchema(t),
  });

export const signupSchema = (t) =>
  z.object({
    body: signupBodySchema(t),
  });