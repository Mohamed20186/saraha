import app from "./app.js";
import { setCache } from "./common/service/cashe.service.js";
//import { sendMail } from "./common/service/mail.service.js";
import configService from "./config/config.service.js";
import dbConnection from "./database/connections/connection.js";
import { client } from "./database/connections/redis.connection.js";
import {
  verifyMailConnection,
  sendMail,
} from "./common/service/mail.service.js";
import { buildEmailHtml } from "./common/utils/mail.templates.js";

const startServer = async () => {
  try {
    await dbConnection();

    try {
      await verifyMailConnection();
    } catch (mailError) {
      console.warn(
        "Mail server is unreachable at startup; continuing anyway. Verification emails may fail until SMTP is reachable:",
        mailError.message,
      );
    }
    
    await setCache({ key: "age", value: "28", ttl: 10 });
    app.listen(configService.port, () => {
      console.log(`Server is running on port ${configService.port}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
