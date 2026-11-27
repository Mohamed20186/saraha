import { ZodError } from "zod";
import multer from "multer";

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

   if (err instanceof ZodError) {

    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";

    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge ? "File is too large" : err.message,
    });
  }

  const statusCode = Number(err.statusCode || err.status);

  const status =
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
      ? statusCode
      : 500;

  const isProduction = process.env.NODE_ENV === "production";

  const message =
    isProduction && status === 500
      ? "Internal Server Error"
      : err.message || "Something went wrong";

  const response = {
    success: false,
    message,
    ...(isProduction ? {} : { stack: err.stack }),
  };

  console.error(err);

  return res.status(status).json(response);
};
