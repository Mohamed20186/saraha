import mongoose from "mongoose";
import z from "zod";

export const userProfileSchema = z.object({
  params: z.strictObject({
    userId: z
      .string()
      .length(24)
      .refine((userId) => mongoose.isObjectIdOrHexString(userId), {
        error: "Invalid ObjectId",
      }),
  }),
  query: z.strictObject({
    data: z.coerce.number({ error: "not number " }),
  }),
});
