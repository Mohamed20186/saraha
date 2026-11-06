
import app from "./app.js";
import { decryptData, encryptData } from "./common/security/encryption.js";
import configService from "./config/config.service.js";
import dbConnection from "./database/connection.js";

const startServer = async () => {
  try {
    await dbConnection();

    app.listen(configService.port, () => {
      console.log(
        `Server is running on port ${configService.port}`
      );
    });

  } catch (error) {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  }
 
 

};

startServer();
