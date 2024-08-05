const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const { returnStringDate } = require("../utils/date.function");
const ErrorResponse = require("../utils/errorResponse");
const mime = require('mime-types'); // MIME turini aniqlash uchun kerak


// create task 
exports.createFileTask = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return next(new ErrorResponse("Fayl yuklanmadi", 400));
    }

    const { battalionName, taskInfo, forUserInfo } = req.body;

    if (!battalionName || !taskInfo || !forUserInfo) {
        return next(new ErrorResponse('So\'rovlar bo\'sh qolishi mumkin emas', 400));
    }

    const { buffer, originalname } = req.file;

    try {
        // Faylni bazaga qo'shish
        const file = await pool.query(
            `INSERT INTO files (filename, file_data) VALUES ($1, $2) RETURNING id`,
            [originalname, buffer]
        );

        // batalion nomi va foydalanuvchi ID bo'yicha foydalanuvchini olish
        const battalion = await pool.query(
            `SELECT id FROM users WHERE username = $1 AND user_id = $2`,
            [battalionName.trim(), req.user.id]
        );

        if (battalion.rows.length === 0) {
            return next(new ErrorResponse('Batalion topilmadi', 404));
        }

        // Yangi vazifani bazaga qo'shish
        await pool.query(
            `INSERT INTO filetasks(admin_id, user_id, admin_file_id, taskinfo, taskdate, foruserinfo) 
             VALUES($1, $2, $3, $4, $5, $6)`,
            [req.user.id, battalion.rows[0].id, file.rows[0].id, taskInfo, new Date(), forUserInfo]
        );

        return res.status(200).json({
            success: true,
            data: "Kiritildi"
        });
    } catch (error) {
        console.error(error);
        return next(new ErrorResponse('Serverda xatolik yuz berdi', 500));
    }
});

// get all tasks 
exports.getAllTasks = asyncHandler(async (req, res, next) => {
    try {
        const tasks = await pool.query(
            `SELECT id, user_id, admin_file_id, taskinfo, taskdate, user_file_id
             FROM filetasks 
             WHERE admin_id = $1 
             ORDER BY taskdate`,
            [req.user.id]
        );

        const resultArray = tasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate);
            return task;
        });

        res.status(200).json({
            success: true,
            data: resultArray
        });
    } catch (error) {
        console.error(error);
        return next(new ErrorResponse('Serverda xatolik yuz berdi', 500));
    }
});

// get Admin File 
exports.getAdminFile = asyncHandler(async (req, res, next) => {
    try {
        const file = await pool.query(`SELECT * FROM files WHERE id = $1`, [req.params.id]);
        
        if (file.rows.length === 0) {
            return next(new ErrorResponse('Fayl topilmadi', 404));
        }

        const resultFile = file.rows[0];
        const mimeType = mime.lookup(resultFile.filename); // MIME turini aniqlash

        res.setHeader('Content-Disposition', `attachment; filename=${resultFile.filename}`);
        res.setHeader('Content-Type', mimeType);
        res.send(resultFile.file_data);
    } catch (error) {
        console.error(error);
        return next(new ErrorResponse('Serverda xatolik yuz berdi', 500));
    }
});
