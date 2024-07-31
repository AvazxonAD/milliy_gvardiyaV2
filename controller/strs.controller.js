const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// create strs
exports.create = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const strs = await pool.query(`SELECT id, strs FROM strs WHERE user_id = $1`, [req.user.id]);
    if(strs.rows[0]){
        return next(new ErrorResponse('siz malumot kiritib bolgansiz ochirib keyin urinib koring yoki malumotni yangilang', 400))
    }

    const { str } = req.body;

    if (!str) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const strResult = await pool.query(`INSERT INTO strs(str, user_id) VALUES($1, $2) RETURNING *`, [str.trim(), req.user.id]);

    return res.status(200).json({
        success: true,
        data: strResult.rows[0]
    });
});

// update strs
exports.update = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const { str } = req.body;

    if (!str) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const strResult = await pool.query(`UPDATE strs SET str = $1 WHERE id = $2 RETURNING *`, [str, req.params.id]);

    if (strResult.rows.length === 0) {
        return next(new ErrorResponse(` server xatolik hisob raqami topilmadi`, 404));
    }

    return res.status(200).json({
        success: true,
        data: strResult.rows[0]
    });
});

// delete strs
exports.deletestrs = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const str = await pool.query(`DELETE FROM strs WHERE id = $1 RETURNING *`, [req.params.id]);

    if (str.rows.length === 0) {
        return next(new ErrorResponse(`server xatolik  topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: str.rows[0]
    });
});

// get all strs
exports.getAll = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const strs = await pool.query(`SELECT id, str FROM strs WHERE user_id = $1`, [req.user.id]);

    res.status(200).json({
        success: true,
        data: strs.rows
    });
});
