const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// create banks
exports.create = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const banks = await pool.query(`SELECT id, banks FROM banks WHERE user_id = $1`, [req.user.id]);
    if(banks.rows[0]){
        return next(new ErrorResponse('siz malumot kiritib bolgansiz ochirib keyin urinib koring yoki malumotni yangilang', 400))
    }

    const { bank } = req.body;

    if (!bank) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const bankResult = await pool.query(`INSERT INTO banks(bank, user_id) VALUES($1, $2) RETURNING *`, [bank.trim(), req.user.id]);

    return res.status(200).json({
        success: true,
        data: bankResult.rows[0]
    });
});

// update banks
exports.update = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const { bank } = req.body;

    if (!bank) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const bankResult = await pool.query(`UPDATE banks SET bank = $1 WHERE id = $2 RETURNING *`, [bank, req.params.id]);

    if (bankResult.rows.length === 0) {
        return next(new ErrorResponse(` server xatolik hisob raqami topilmadi`, 404));
    }

    return res.status(200).json({
        success: true,
        data: bankResult.rows[0]
    });
});

// delete banks
exports.deletebanks = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const bank = await pool.query(`DELETE FROM banks WHERE id = $1 RETURNING *`, [req.params.id]);

    if (bank.rows.length === 0) {
        return next(new ErrorResponse(`server xatolik  topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: bank.rows[0]
    });
});

// get all banks
exports.getAll = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const banks = await pool.query(`SELECT id, bank FROM banks WHERE user_id = $1`, [req.user.id]);

    res.status(200).json({
        success: true,
        data: banks.rows
    });
});
