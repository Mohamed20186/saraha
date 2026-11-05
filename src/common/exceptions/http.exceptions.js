const createError = (message, statusCode, code) => {
    const error = new Error(message);

    error.statusCode = statusCode;
    error.code = code;
    error.isOperational = true;

    return error;
};

export const badRequest = (message = "Bad Request") =>
    createError(message, 400, "BAD_REQUEST");

export const unauthorized = (message = "Unauthorized") =>
    createError(message, 401, "UNAUTHORIZED");

export const forbidden = (message = "Forbidden") =>
    createError(message, 403, "FORBIDDEN");

export const notFound = (message = "Resource Not Found") =>
    createError(message, 404, "NOT_FOUND");

export const conflict = (message = "Resource Already Exists") =>
    createError(message, 409, "CONFLICT");

export const unprocessableEntity = (message = "Unprocessable Entity") =>
    createError(message, 422, "UNPROCESSABLE_ENTITY");