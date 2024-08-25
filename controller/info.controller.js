const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const path = require('path')
const fs = require('fs')

// post a video_info 
exports.postVideoInfo = asyncHandler(async (req, res, next) => {
    const {title, descr, admin_status} = req.body
    if(!req.file){
        return next(new ErrorResponse('file yuklashda xatolik', 400))
    }
    if(!title || !descr || !admin_status){
        return next(new ErrorResponse('video nomi yoki tarif yoki status bosh qolmasligi kerak', 403))
    }
    let status = false
    if(admin_status === 'true'){
        status = true
    }

    const url = 'uploads/' + req.file.filename

    const result = await pool.query(`INSERT INTO infos(title, descr, url, admin_status) VALUES($1, $2, $3, $4) RETURNING *
    `, [title, descr, url, status])

    return res.status(200).json({
        success: true, 
        data: result.rows[0]
    })     
})

// get all infos 
exports.getAllInfos = asyncHandler(async (req, res, next) => {
    const status = req.user.adminstatus
    const infos = await pool.query(`SELECT id, title FROM infos WHERE admin_status = $1`, [status])
    res.status(200).json({
        success: true,
        data: infos.rows
    })
})

// get element by id 
exports.getElementById = asyncHandler(async (req, res, next) => {
    const range = req.headers.range
    if(!range){
        return next(new ErrorResponse('Range parametr is missing', 400))
    }

    const info = await pool.query(`SELECT * FROM infos WHERE id = $1`, [req.params.id])
    if(!info.rows[0]){
        return next(new ErrorResponse('server xatolik', 500))
    }
    const pathFile = path.join(__dirname, '../public/', info.rows[0].url);

    const sizeOfVideo = fs.statSync(pathFile).size

    const CHUNK_SIZE = 1000000
    const start = Number(range.replace(/\D/g, ""))
    const end = Math.min(start + CHUNK_SIZE, sizeOfVideo - 1)

    const contentlength = end - start + 1

    const headers = {
        "Content-Range": `bytes ${start}-${end}/${sizeOfVideo} `,
        "Accept-Range": "bytes",
        "Content-length": contentlength,
        "Content-type": "video/mp4"
    }

    const videoStream = fs.createReadStream(pathFile, {start, end})
    videoStream.pipe(res)
})

// delete video 
exports.deleteVideo = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse('Mumkin emas', 403));
    }

    const file = await pool.query(`SELECT * FROM infos WHERE id = $1`, [req.params.id]);

    if (file.rows.length === 0) {
        return next(new ErrorResponse('Fayl topilmadi', 404));
    }

    const deleteFile = file.rows[0];
    
    if (!deleteFile.url) {
        return next(new ErrorResponse('Fayl URL topilmadi', 404));
    }

    const pathFile = path.join(__dirname, '../public/', deleteFile.url);

    fs.unlink(pathFile, (err) => {
        if (err) {
            return next('Faylni o\'chirishda xatolik yuz berdi', 500);
        }
    });

    await pool.query(`DELETE FROM infos WHERE id = $1`, [req.params.id])

    return res.status(200).json({
        success: true, 
        data: deleteFile
    })
})
