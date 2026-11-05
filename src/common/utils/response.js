export const response = ({
    res,
    statusCode = 200,
    message = "Request completed successfully",
    data = null,
    meta,
}) => {

    const responseBody = {
        success: statusCode >= 200 && statusCode < 300,
        message,
        data,
    };

    // Add meta only when it exists
    if (meta !== undefined) {
        responseBody.meta = meta;
    }

    return res.status(statusCode).json(responseBody);
};