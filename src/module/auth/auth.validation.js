import { z } from "zod";
import { gender } from "../../common/enums/gender.enum.js";
import gf from "../../common/utils/generalFildes.js";
import { logoutEnum } from "../../common/enums/logout.enum.js";

const genderValues = Object.values(gender).filter(
  (value) => typeof value === "number"
);

const logoutValues = Object.values(logoutEnum).filter(
  (value) => typeof value === "number"
);
export const loginBodySchema = (t) => {
  const fields = gf(t);

  return z.strictObject({
    email: fields.email,
    password: fields.password,
  });
};

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

export const logoutBodySchema = (t) => {
  return z.strictObject({
    logoutType: z
      .number()
      .int()
      .refine((value) => logoutValues.includes(value), {
        error: t("validation.invalidLogoutType"),
      }),
  });
};

export const loginSchema = (t) =>
  z.object({
    body: loginBodySchema(t),
  });

export const signupSchema = (t) =>
  z.object({
    body: signupBodySchema(t),
  });

export const logoutSchema = (t) =>
  z.object({
    body: logoutBodySchema(t),
  });