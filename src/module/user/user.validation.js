import mongoose from "mongoose";
import z from "zod";
import gf from "../../common/utils/generalFildes.js";

export const userProfileSchema = (t) =>
  z.object({
    params: z.strictObject({
      userId: z
        .string()
        .length(24)
        .refine((userId) => mongoose.isObjectIdOrHexString(userId), {
          error: "Invalid ObjectId",
        }),
    }),
  });

export const updateProfileBodySchema = (t) => {
  const fields = gf(t);

  return z
    .strictObject({
      firstName: fields.firstName.optional(),
      lastName: fields.lastName.optional(),
      phone: fields.egyptianPhone.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      error: t("validation.emptyUpdate"),
    });
};

export const updateProfileSchema = (t) =>
  z.object({
    body: updateProfileBodySchema(t),
  });
