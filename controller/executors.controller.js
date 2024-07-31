const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// create executors
exports.create = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const executors = await pool.query(`SELECT id, executors FROM executors WHERE user_id = $1`, [req.user.id]);
    if(executors.rows[0]){
        return next(new ErrorResponse('siz malumot kiritib bolgansiz ochirib keyin urinib koring yoki malumotni yangilang', 400))
    }

    const { executor } = req.body;

    if (!executor) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const executorResult = await pool.query(`INSERT INTO executors(executor, user_id) VALUES($1, $2) RETURNING *`, [executor.trim(), req.user.id]);

    return res.status(200).json({
        success: true,
        data: executorResult.rows[0]
    });
});

// update executors
exports.update = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const { executor } = req.body;

    if (!executor) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const executorResult = await pool.query(`UPDATE executors SET executor = $1 WHERE id = $2 RETURNING *`, [executor, req.params.id]);

    if (executorResult.rows.length === 0) {
        return next(new ErrorResponse(` server xatolik hisob raqami topilmadi`, 404));
    }

    return res.status(200).json({
        success: true,
        data: executorResult.rows[0]
    });
});

// delete executors
exports.deleteExecutors = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const executor = await pool.query(`DELETE FROM executors WHERE id = $1 RETURNING *`, [req.params.id]);

    if (executor.rows.length === 0) {
        return next(new ErrorResponse(`server xatolik  topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: executor.rows[0]
    });
});

// get all executors
exports.getAll = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const executors = await pool.query(`SELECT id, executor FROM executors WHERE user_id = $1`, [req.user.id]);

    res.status(200).json({
        success: true,
        data: executors.rows
    });
});
