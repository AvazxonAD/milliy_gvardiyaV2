const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// create mfos
exports.create = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const mfos = await pool.query(`SELECT id, mfos FROM mfos WHERE user_id = $1`, [req.user.id]);
    if(mfos.rows[0]){
        return next(new ErrorResponse('siz malumot kiritib bolgansiz ochirib keyin urinib koring yoki malumotni yangilang', 400))
    }

    const { mfo } = req.body;

    if (!mfo) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const mfoResult = await pool.query(`INSERT INTO mfos(mfo, user_id) VALUES($1, $2) RETURNING *`, [mfo.trim(), req.user.id]);

    return res.status(200).json({
        success: true,
        data: mfoResult.rows[0]
    });
});

// update mfos
exports.update = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const { mfo } = req.body;

    if (!mfo) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const mfoResult = await pool.query(`UPDATE mfos SET mfo = $1 WHERE id = $2 RETURNING *`, [mfo, req.params.id]);

    if (mfoResult.rows.length === 0) {
        return next(new ErrorResponse(` server xatolik hisob raqami topilmadi`, 404));
    }

    return res.status(200).json({
        success: true,
        data: mfoResult.rows[0]
    });
});

// delete mfos
exports.deletemfos = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const mfo = await pool.query(`DELETE FROM mfos WHERE id = $1 RETURNING *`, [req.params.id]);

    if (mfo.rows.length === 0) {
        return next(new ErrorResponse(`server xatolik  topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: mfo.rows[0]
    });
});

// get all mfos
exports.getAll = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const mfos = await pool.query(`SELECT id, mfo FROM mfos WHERE user_id = $1`, [req.user.id]);

    res.status(200).json({
        success: true,
        data: mfos.rows
    });
});
