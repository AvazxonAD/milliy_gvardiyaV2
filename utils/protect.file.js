const multer = require('multer');
const path = require('path');

// Saqlash joyini sozlash
const storage = multer.diskStorage({
  // Faylni saqlash manzili
  destination: './public/uploads',
  // Fayl nomini sozlash
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Yuklash sozlamalari
const upload = multer({
  storage,
  limits: { fileSize: 100000000 }, // Maksimal fayl o'lchami (100MB)
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

// Fayl turlarini tekshirish
function checkFileType(file, cb) {
  // Ruxsat etilgan video formatlari
  const filetypes = /mp4|avi|mov|wmv|flv|mkv/;
  // Fayl kengaytmasi va mimetype tekshiruvi
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    // Fayl ruxsat etilgan bo'lsa
    return cb(null, true);
  } else {
    // Fayl ruxsat etilmagan bo'lsa
    cb(new Error('Xato: Faqat video fayllarini yuklash mumkin'));
  }
}

module.exports = upload;
