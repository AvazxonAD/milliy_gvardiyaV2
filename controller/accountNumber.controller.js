const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// create accountNumber
exports.create = asyncHandler(async (req, res, next) => {
    const { accountNumber } = req.body;
    console.log(accountNumber.length)
    if (!accountNumber || accountNumber.length !== 20) {
        return next(new ErrorResponse(`Xisob raqami 20 xonalik son bo'lishi kerak`, 400));
    }

    const account = await pool.query(`INSERT INTO accountnumber(accountnumber) VALUES($1) RETURNING * `, [accountNumber]);

    return res.status(200).json({
        success: true,
        data: account.rows[0]
    });
});

// update accountNumber
exports.update = asyncHandler(async (req, res, next) => {
    const { accountNumber } = req.body;
    if (!accountNumber || accountNumber.length !== 20) {
        return next(new ErrorResponse(`Xisob raqami 20 xonalik son bo'lishi kerak`, 400));
    }

    const account = await pool.query(`UPDATE accountnumber SET accountnumber = $1 WHERE id = $2 RETURNING * `, [accountNumber, req.params.id]);

    if (account.rows.length === 0) {
        return next(new ErrorResponse(`Xisob raqami topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: account.rows[0]
    });
});

// delete accountNumber
exports.deleteAccountNumber = asyncHandler(async (req, res, next) => {
    const account = await pool.query(`DELETE FROM accountnumber WHERE id = $1 RETURNING * `, [req.params.id]);

    if (account.rows.length === 0) {
        return next(new ErrorResponse(`Xisob raqami topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: account.rows[0]
    });
});


// get all accountnumber 
exports.getAllAccountNumber = asyncHandler(async (req, res, next) => {
    const accounts = await pool.query(`SELECT id, accountnumber FROM accountnumber`)
    
    res.status(200).json({
        success: true,
        data: accounts.rows
    })
})