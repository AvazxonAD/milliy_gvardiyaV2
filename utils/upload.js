const multer = require('multer');
const path = require('path');
const fileSizeLimit = 20 * 1000 * 1000;

// Set storage
const storage = multer.diskStorage({
  destination: './public/uploads',
  filename: function(req, file, cb) {
    // Fayl nomini o'zgartirish: fieldname-vaqti.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Upload
const upload = multer({
  storage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

// Check file types
function checkFileType(file, cb) {
  const filetypes = /xlsx|xls|xlsm/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.mimetype === 'application/vnd.ms-excel';

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Excel faylini kiriting (xlsx, xls, yoki xlsm)'));
  }
}

module.exports = upload;