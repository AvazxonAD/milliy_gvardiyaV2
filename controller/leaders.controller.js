const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// create leaders
exports.create = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const leaders = await pool.query(`SELECT id, leaders FROM leaders WHERE user_id = $1`, [req.user.id]);
    if(leaders.rows[0]){
        return next(new ErrorResponse('siz malumot kiritib bolgansiz ochirib keyin urinib koring yoki malumotni yangilang', 400))
    }

    const { leader } = req.body;

    if (!leader) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const leaderResult = await pool.query(`INSERT INTO leaders(leader, user_id) VALUES($1, $2) RETURNING *`, [leader.trim(), req.user.id]);

    return res.status(200).json({
        success: true,
        data: leaderResult.rows[0]
    });
});

// update leaders
exports.update = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const { leader } = req.body;

    if (!leader) {
        return next(new ErrorResponse(`Sorovlar bosh qolishi mumkin emas`, 400));
    }

    const leaderResult = await pool.query(`UPDATE leaders SET leader = $1 WHERE id = $2 RETURNING *`, [leader, req.params.id]);

    if (leaderResult.rows.length === 0) {
        return next(new ErrorResponse(` server xatolik hisob raqami topilmadi`, 404));
    }

    return res.status(200).json({
        success: true,
        data: leaderResult.rows[0]
    });
});

// delete leaders
exports.deleteleaders = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const leader = await pool.query(`DELETE FROM leaders WHERE id = $1 RETURNING *`, [req.params.id]);

    if (leader.rows.length === 0) {
        return next(new ErrorResponse(`server xatolik  topilmadi ID: ${req.params.id}`, 404));
    }

    return res.status(200).json({
        success: true,
        data: leader.rows[0]
    });
});

// get all leaders
exports.getAll = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const leaders = await pool.query(`SELECT id, leader FROM leaders WHERE user_id = $1`, [req.user.id]);

    res.status(200).json({
        success: true,
        data: leaders.rows
    });
});
