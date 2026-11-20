
import { z } from "zod";
import { gender } from "../../common/enums/gender.enum.js";
import gf from "../../common/utils/generalFildes.js";


const genderValues = Object.values(gender).filter(
  (value) => typeof value === "number"
);


export const loginBodySchema = z.strictObject({
  email: gf.email,
  password: gf.password,
});


export const signupBodySchema = loginBodySchema.safeExtend({
  password: gf.strongPassword,

  firstName: gf.firstName,

  lastName: gf.lastName,

  phone: gf.egyptianPhone.optional(),

  gender: z
    .number()
    .int()
    .refine((value) => genderValues.includes(value), {
      error: "Invalid gender",
    })
    .optional(),

  confirmPassword: gf.password,
}).superRefine((data, ctx) => {


  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords don't match",
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
