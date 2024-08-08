const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const pool = require('../config/db');
const generateToken = require('../utils/generate.token');

// login 
exports.login = asyncHandler(async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 400));
    }
    
    const user = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
    
    if (!user.rows[0] || user.rows[0].password !== password) {
        return next(new ErrorResponse("Username yoki parol xato kiritildi", 403));
    }

    if(user.rows[0].status){
        return next(new ErrorResponse("Username yoki parol xato kiritildi", 403))
    }


    const token = generateToken(user.rows[0]);

    return res.status(200).json({
        success: true,
        data: user.rows[0],
        token
    });
});

// create batalyon 
exports.createBatalyon = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    const { username, password, status} = req.body;

    if (!username || !password) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 400));
    }

    /*const regex = /^(?=.*[a-zA-Z])(?=.*\d)[^\s]{8,}$/;
    if(!regex.test(password)){
        return next(new ErrorResponse("password sodda bolmasligi kerak"))
    }*/

    const user = await pool.query(`SELECT * FROM users WHERE username = $1`, [username.trim()]);

    if (user.rows[0]) {
        return next(new ErrorResponse("Bu batalyon avval kiritilgan", 400));
    }

    const newUser = await pool.query(`INSERT INTO users(username, password, status, user_id) VALUES($1, $2, $3, $4) RETURNING *`, [username.trim(), password, status, req.user.id]);

    return res.status(200).json({
        success: true,
        data: newUser.rows[0]
    });
});

// update profile 
exports.update = asyncHandler(async (req, res, next) => {
    const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
    const { username, oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 400));
    }

    if (user.rows[0].password !== oldPassword) {
        return next(new ErrorResponse("Eski parol xato kiritildi", 400));
    }
    
    /*const regex = /^(?=.*[a-zA-Z])(?=.*\d)[^\s]{8,}$/;
    if(!regex.test(newPassword)){
        return next(new ErrorResponse("password sodda bolmasligi kerak"))
    }*/

    if (username) {
        if (req.user.username !== username) {
            const test = await pool.query(`SELECT * FROM users WHERE username = $1`, [username.trim()]);
            if (test.rows[0]) {
                return next(new ErrorResponse(`Bu username ga ega batalyon mavjud: ${test.rows[0].username}`, 400));
            }
        }
    }

    const updateUser = await pool.query(`UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING *`, [username ? username : user.rows[0].username, newPassword, req.user.id]);
    
    return res.status(200).json({
        success: true,
        data: updateUser.rows[0]
    });
});

// update batalyons 
exports.updateBatalyons = asyncHandler(async (req, res, next) => {
    const batalyon = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 400));
    }

    if (username) {
        if (batalyon.rows[0].username !== username) {
            const test = await pool.query(`SELECT * FROM users WHERE username = $1`, [username.trim()]);
            if (test.rows[0]) {
                return next(new ErrorResponse(`Bu username ga ega batalyon mavjud: ${test.rows[0].username}`, 400));
            }
        }
    }

    /*const regex = /^(?=.*[a-zA-Z])(?=.*\d)[^\s]{8,}$/;
    if(!regex.test(newPassword)){
        return next(new ErrorResponse("password sodda bolmasligi kerak"))
    }*/
    
    const updateUser = await pool.query(`UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING *`, [username, newPassword, req.params.id]);
        
    return res.status(200).json({
        success: true,
        data: updateUser.rows[0]
    });
});

// get profile 
exports.getProfile = asyncHandler(async (req, res, next) => {
    // admin for
    if (req.user.adminstatus) {
        const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
        const users = await pool.query(`SELECT * FROM users WHERE adminstatus = $1 AND user_id = $2`, [false, req.user.id]);
        return res.status(200).json({
            success: true,
            data: user.rows[0],
            users: users.rows
        });
    }
    // user for 
    if (!req.user.adminstatus) {
        const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
        return res.status(200).json({
            success: true,
            data: user.rows[0]
        });
    }
});

// delete users 
exports.deleteUser = asyncHandler(async (req, res, next) =>{
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 400))
    }
    const delteUser = await pool.query(`DELETE FROM users WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.id])
    if(delteUser.rows[0]){
        return res.status(200).json({
            success: true,
            data: "DELETE true"
        })
    }else{
        return next(new ErrorResponse('DELETE false', 500))
    }
})