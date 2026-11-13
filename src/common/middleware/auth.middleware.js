
import { verifyToken, comparePassword } from "../security/index.js";
import { User } from "../../database/index.js";
import { AUTH_ENUM } from "../enums/auth.enum.js";
import { hashEnum } from "../enums/hash.enum.js";

export const authenticate = ({ tokenType }) => {
  return async (req, res, next) => {
    try {
      const authorization = req.headers.authorization;

      if (!authorization) {
        return res.status(401).json({
          success: false,
          message: "Authorization header is required",
        });
      }

      // Extract scheme and credentials
      const [scheme, ...credentialsParts] = authorization
        .trim()
        .split(/\s+/);

      const credentials = credentialsParts.join(" ");

      if (!credentials) {
        return res.status(401).json({
          success: false,
          message: "Authorization credentials are required",
        });
      }

      let user;

      switch (scheme.toLowerCase()) {
        case AUTH_ENUM.BEARER: {
          const decoded = verifyToken({
            token: credentials,
            tokenType,
          });

          if (!decoded?.sub) {
            return res.status(401).json({
              success: false,
              message: "Invalid token",
            });
          }

          user = await User.findById(decoded.sub).select("-password");

          if (!user) {
            return res.status(401).json({
              success: false,
              message: "User not found",
            });
          }

          req.auth = decoded;
          req.token = credentials;

          break;
        }

        case AUTH_ENUM.BASIC: {
          const decodedCredentials = Buffer
            .from(credentials, "base64")
            .toString("utf8");

          const separatorIndex = decodedCredentials.indexOf(":");

          if (separatorIndex === -1) {
            return res.status(401).json({
              success: false,
              message: "Invalid Basic credentials",
            });
          }

          const email = decodedCredentials.slice(0, separatorIndex);
          const password = decodedCredentials.slice(separatorIndex + 1);

          user = await User.findOne({ email }).select("+password");

          if (!user) {
            return res.status(401).json({
              success: false,
              message: "Invalid email or password",
            });
          }

          // Compare password with stored hash
          const isPasswordValid = await comparePassword({
            plainText: password,
            hashedPassword: user.password,
            lib: hashEnum.argon,
          });

          if (!isPasswordValid) {
            return res.status(401).json({
              success: false,
              message: "Invalid email or password",
            });
          }

          req.auth = {
            sub: user._id,
            scheme: AUTH_ENUM.BASIC,
          };

          // Do not expose password hash
          user = user.toObject();
          delete user.password;

          break;
        }

        default:
          return res.status(401).json({
            success: false,
            message: "Unsupported authorization scheme",
          });
      }

      req.user = user;

      return next();

    } catch (error) {
      console.error("AUTH ERROR:", error.name, error.message);

      return res.status(401).json({
        success: false,
        message: "Invalid or expired credentials",
      });
    }
  };
};
