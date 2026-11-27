import multer from "multer";
import fs from "node:fs";
export const fileTypes = {
  images: ["image/jpeg", "image/jpg", "image/png"],
  pdf: ["application/pdf"],
};

export const multerMiddleware = ({
  storageFolder = " general",
  types = fileTypes.images,
  maxFileSize = 5 

}) => {
  let storage = multer.diskStorage({
    destination: function (req, file, cb) {
      let folderPath = "./uploads/" + storageFolder;
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    },
    filename: function (req, file, cb) {
      return cb(null, Date.now() + "-" + file.originalname);
    },
  });
  let fileFilter = function (req, file, cb) {
    if (!types.includes(file.mimetype)) {
      cb(new Error("not allowed file types"), false);
    }
  };

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits : {
        fileSize : maxFileSize * 1024 * 1024
    }
  });
};
