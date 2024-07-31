const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// create addresses
exports.create = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const addresses = await pool.query(`SELECT id, addresses FROM addresses WHERE user_id = $1`, [req.user.id]);
    if(addresses.rows[0]){
        return next(new ErrorResponse('siz malumot kiritib bolgansiz ochirib keyin urinib koring yoki malumotni yangilang', 400))
    }

    const { address } = req.body;

    if (!address) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const addressResult = await pool.query(`INSERT INTO addresses(address, user_id) VALUES($1, $2) RETURNING *`, [address.trim(), req.user.id]);

    return res.status(200).json({
        success: true,
        data: addressResult.rows[0]
    });
});

// update addresses
exports.update = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const { address } = req.body;

    if (!address) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const addressResult = await pool.query(`UPDATE addresses SET address = $1 WHERE id = $2 RETURNING *`, [address, req.params.id]);

    if (addressResult.rows.length === 0) {
        return next(new ErrorResponse(` server xatolik hisob raqami topilmadi`, 404));
    }

    return res.status(200).json({
        success: true,
        data: addressResult.rows[0]
    });
});

// delete addresses
exports.deleteaddresses = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const address = await pool.query(`DELETE FROM addresses WHERE id = $1 RETURNING *`, [req.params.id]);

    if (address.rows.length === 0) {
        return next(new ErrorResponse(`server xatolik  topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: address.rows[0]
    });
});

// get all addresses
exports.getAll = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const addresses = await pool.query(`SELECT id, address FROM addresses WHERE user_id = $1`, [req.user.id]);

    res.status(200).json({
        success: true,
        data: addresses.rows
    });
});
