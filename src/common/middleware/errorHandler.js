
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
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
