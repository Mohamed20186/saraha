
import { verifyToken } from "../security/index.js";
import { User } from "../../database/index.js";

export const authenticate = ({ tokenType }) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Authorization token is required",
        });
      }

      const decoded = verifyToken({
        token,
        tokenType
      });

      if (!decoded?.sub) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      const user = await User.findById(decoded.sub).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      req.auth = decoded;
      req.token = token;
      req.user = user;

      next();

    } catch (error) {

      console.error("AUTH ERROR:", error.name, error.message);

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  };
};
