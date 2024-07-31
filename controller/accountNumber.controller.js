const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// create accountNumber
exports.create = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const { accountNumber } = req.body;

    if (!accountNumber || accountNumber.length < 20) {
        return next(new ErrorResponse(`Hisob raqami 20 xonalik son bo'lishi kerak`, 400));
    }

    const account = await pool.query(`INSERT INTO accountnumber(accountnumber, user_id) VALUES($1, $2) RETURNING *`, [accountNumber, req.user.id]);

    return res.status(200).json({
        success: true,
        data: account.rows[0]
    });
});

// update accountNumber
exports.update = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const { accountNumber } = req.body;

    if (!accountNumber || accountNumber.length !== 20) {
        return next(new ErrorResponse(`Hisob raqami 20 xonalik son bo'lishi kerak`, 400));
    }

    const account = await pool.query(`UPDATE accountnumber SET accountnumber = $1 WHERE id = $2 RETURNING *`, [accountNumber, req.params.id]);

    if (account.rows.length === 0) {
        return next(new ErrorResponse(` server xatolik hisob raqami topilmadi`, 404));
    }

    return res.status(200).json({
        success: true,
        data: account.rows[0]
    });
});

// delete accountNumber
exports.deleteAccountNumber = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const account = await pool.query(`DELETE FROM accountnumber WHERE id = $1 RETURNING *`, [req.params.id]);

    if (account.rows.length === 0) {
        return next(new ErrorResponse(`server xatolik hisob raqami topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: account.rows[0]
    });
});

// get all accountnumbers
exports.getAllAccountNumbers = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const accounts = await pool.query(`SELECT id, accountnumber FROM accountnumber WHERE user_id = $1`, [req.user.id]);

    res.status(200).json({
        success: true,
        data: accounts.rows
    });
});
