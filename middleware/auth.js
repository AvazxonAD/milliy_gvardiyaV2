const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler.js');
const ErrorResponse = require('../utils/errorResponse.js');

module.exports = asyncHandler(async (req, res, next) => {
    let token;

    // Foydalanuvchidan tokenni olamiz
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Agar token mavjud bo'lmasa
    if (!token) {
        return next(new ErrorResponse('Token notog\'ri jonatildi', 403));
    }
    try {
        // Tokenni tekshiramiz
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Agar token yaroqsiz bo'lsa
        if (!decoded) {
            return next(new ErrorResponse("Siz tizimga kirmagansiz", 403));
        }

        // Tokenning amal qilish muddatini tekshiramiz
        const currentTimestamp = Math.floor(Date.now() / 1000); // Joriy vaqt
        if (decoded.exp && decoded.exp < currentTimestamp) {
            return next(new ErrorResponse("Token muddati tugagan", 403));
        }

        // Foydalanuvchi ma'lumotlarini saqlaymiz
        req.user = decoded;

        // Keyingi middleware'ga o'tamiz
        next();
    } catch (err) {
        // Xatolikni qaytarib yuboramiz
        return next(new ErrorResponse('Token eskirgan yoki yaroqsiz', 403));
    }
});
