import { verifyToken } from "../security/index.js";

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const decoded = verifyToken({ token });

    if (!decoded?.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    req.auth = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};