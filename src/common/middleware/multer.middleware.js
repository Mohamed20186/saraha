
import multer from "multer";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileTypeFromFile } from "file-type";
import { exceptions } from "../exceptions/index.js";

const extensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

export const fileTypes = {
  images: ["image/jpeg", "image/png"],
  pdf: ["application/pdf"],
};

export const multerMiddleware = ({
  storageFolder = "general",
  types = fileTypes.images,
  maxFileSize = 5,
} = {}) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const folderPath = `./uploads/${storageFolder}`;

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      cb(null, folderPath);
    },

    filename: function (req, file, cb) {
      const ext = extensions[file.mimetype] || "";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (!types.includes(file.mimetype)) {
      return cb(exceptions.badRequest("Not allowed file types"));
    }

    return cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize * 1024 * 1024,
    },
  });
};

export const processFile = ({
  types = fileTypes.images,
  required = true,
} = {}) => {
  return async (req, res, next) => {
    const files = req.file
      ? [req.file]
      : Array.isArray(req.files)
      ? req.files
      : [];

    try {
      if (files.length === 0) {
        if (required) throw exceptions.badRequest("No file uploaded");
        return next();
      }

      const results = await Promise.allSettled(
        files.map((file) => checkFile(file, types))
      );

      const failed = results.find((r) => r.status === "rejected");

      if (failed) {
        await Promise.all(
          files.map((f) => fs.promises.unlink(f.path).catch(() => {}))
        );
        throw failed.reason;
      }

      results.forEach((r, i) => {
        files[i].detectedMimeType = r.value.mime;
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

const checkFile = async (file, types) => {
  if (!file?.path) {
    throw exceptions.badRequest("File path is missing");
  }

  const result = await fileTypeFromFile(file.path);

  if (
    !result ||
    !types.includes(result.mime) ||
    file.mimetype !== result.mime
  ) {
    throw exceptions.badRequest("Invalid file content or type");
  }

  return result;
};
