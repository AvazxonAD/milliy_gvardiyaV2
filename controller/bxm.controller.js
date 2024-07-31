const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// get bxm 
exports.getBxm = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const bxm = await pool.query(`SELECT * FROM bxm`)
    return res.status(200).json({
        success: true,
        data: bxm.rows[0]
    })
})

// update bxm 
exports.updateBxm = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const {summa} = req.body
    if(!summa  || typeof summa !== "number"){
        return next(new ErrorResponse("summaga qiymat kiritish zarur", 400))
    }
    const bxm = await pool.query(`UPDATE bxm SET summa = $1 RETURNING * `, [summa])
    
    return res.status(200).json({
        success: true,
        data: bxm.rows[0]
    })
})