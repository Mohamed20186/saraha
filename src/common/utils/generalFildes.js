import { z } from "zod";

const generalFields = (t) => {
  const requiredString = () =>
    z.string({
      error: (issue) =>
        issue.input === undefined
          ? t("validation.required")
          : t("validation.string"),
    });

  return {
    password: requiredString().min(8, {
      error: t("validation.passwordMin", { min: 8 }),
    }),

    strongPassword: requiredString()
      .min(8, {
        error: t("validation.passwordMin", { min: 8 }),
      })
      .regex(/[A-Z]/, {
        error: t("validation.passwordUppercase"),
      })
      .regex(/[a-z]/, {
        error: t("validation.passwordLowercase"),
      })
      .regex(/\d/, {
        error: t("validation.passwordNumber"),
      })
      .regex(/[^A-Za-z0-9\s]/, {
        error: t("validation.passwordSpecial"),
      }),

    firstName: requiredString()
      .trim()
      .min(3, {
        error: t("validation.firstNameMin", { min: 3 }),
      })
      .max(50, {
        error: t("validation.firstNameMax", { max: 50 }),
      }),

    lastName: requiredString()
      .trim()
      .min(3, {
        error: t("validation.lastNameMin", { min: 3 }),
      })
      .max(50, {
        error: t("validation.lastNameMax", { max: 50 }),
      }),

    egyptianPhone: requiredString()
      .trim()
      .regex(/^01[0125]\d{8}$/, {
        error: t("validation.invalidPhone"),
      }),

    email: z.email({
      error: (issue) =>
        issue.input === undefined
          ? t("validation.required")
          : t("validation.emailInvalid"),
    }),
  };
};

export default generalFields;