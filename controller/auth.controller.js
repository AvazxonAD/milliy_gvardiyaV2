const asyncHandler = require('../middleware/asyncHandler')
const ErrorResponse = require('../utils/errorResponse')
const pool = require('../config/db')
const generateToken = require('../utils/generate.token')
const checkPasswordStrength = require('../utils/checkPassword')

// login 

exports.login = asyncHandler(async (req, res, next) => {
    const {username, password} = req.body
    if(!username || !password){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }
    
    if(username === "Toshkent Shahar IIBB" || username === "98162" || username === "98157"){
        return next(new ErrorResponse("ushbu username bilan royhatdan otib bolmaydi", 400))
    }

    const user = await pool.query(`SELECT * FROM users WHERE username = $1`, [username])
    if(!user.rows[0]){
        return next(new ErrorResponse("username yoki password xato kiritildi", 403))
    }
    if(user.rows[0].password !== password){
        return next(new ErrorResponse("username yoki password xato kiritildi", 403))
    } 
    const token = generateToken(user.rows[0])
    return res.status(200).json({
        success: true,
        data: user.rows[0],
        token

    })
})

// create batalyon 
exports.createBatalyon = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    const {username, password} = req.body
    if(!username || !password){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }
    const user = await pool.query(`SELECT * FROM users WHERE username = $1`, [username])
    if(user.rows[0]){
        return next(new ErrorResponse(" bu batalyon avval kiritilgan", 400))
    }  
    // const test = checkPasswordStrength(password)
    // if(test.score < 3){
    //     return next(new ErrorResponse(new ErrorResponse(`${test.feedback}`,400)))
    // }
    const newUser = await pool.query(`INSERT INTO users(username, password) VALUES($1, $2) RETURNING *
        `, [username.trim(), password])
    return res.status(200).json({
        success: true,
        data: newUser.rows[0]
    })
})

// update profile 
exports.update = asyncHandler(async (req, res, next) => {
    const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id]) 
    const {username, oldPassword, newPassword} = req.body
    if(!oldPassword || !newPassword){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }

    if(user.rows[0].password !== oldPassword){
        return next(new ErrorResponse("eski parol xato kiritildi", 400))
    }

    // const test = checkPasswordStrength(newPassword)
    // if(test.score < 3){
    //     return next(new ErrorResponse(new ErrorResponse(`${test.feedback}`,400)))
    // }

    if(username){
        if(req.user.username !== username){
            const test = await pool.query(`SELECT * FROM users WHERE username = $1`, [username.trim()])
            if(test.rows[0]){
                return next(new ErrorResponse(`Bu username ga ega batalyon mavjud : ${test.rows[0].username}`, 400))
            }
        }
    } 

    const updateUser = await pool.query( `UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING *
        `, [username ? username : user.rows[0].username, newPassword, req.user.id])
    
    return res.status(200).json({
        success: true,
        data: updateUser.rows[0]
    })
})

// update batalyons 
exports.updateBatalyons = asyncHandler(async (req, res, next) => {
    const batalyon = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id])
    const {username, newPassword} = req.body
    
    if(!username || !newPassword){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }

    // const test = checkPasswordStrength(newPassword)
    // if(test.score < 3){
    //     return next(new ErrorResponse(new ErrorResponse(`${test.feedback}`,400)))
    // }

    if(username){
        if(batalyon.rows[0].username !== username){
            const test = await pool.query(`SELECT * FROM users WHERE username = $1`, [username.trim()])
            if(test.rows[0]){
                return next(new ErrorResponse(`Bu username ga ega batalyon mavjud : ${test.rows[0].username}`, 400))
            }
        }
    } 

    const updateUser = await pool.query( `UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING *
        `, [username, newPassword, req.params.id])
    
    return res.status(200).json({
        success: true,
        data: updateUser.rows[0]
    })
})

// get profile 
exports.getProfile = asyncHandler(async (req, res, next) => {
    // admin for 
    if(req.user.adminstatus){
        const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
        const users = await pool.query(`SELECT * FROM users WHERE adminstatus = $1`, [false])
        return res.status(200).json({
            success: true,
            data: user.rows[0],
            users: users.rows
        })
    }
    // user for 
    if(!req.user.adminstatus){
        const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id])
        return res.status(200).json({
            success: true,
            data: user.rows[0],
        })
    }
})