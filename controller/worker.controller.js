const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const checkUsername = require('../utils/checkUserName');
const pool = require("../config/db");


exports.create = asyncHandler(async (req, res, next) => {
    const {workers} = req.body
    for(let worker of workers){
        if(!worker.lastname || !worker.firstname || !worker.fatherName) {
            return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
        }
    
        const test = checkUsername(worker.lastname.trim(), worker.firstname.trim(), worker.fatherName.trim())
        if(!test.lastname || !test.firstname || !test.fatherName){
            return next(new ErrorResponse("Isim Familya Ochistva bosh harifda bolishi zarur", 400))
        }
    
        const testFIO = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2
            `, [`${worker.lastname.trim()} ${worker.firstname.trim()} ${worker.fatherName.trim()}`, req.user.id])
        if(testFIO.rows[0]){
            return next(new ErrorResponse(`Bu fio oldin kiritilgan : ${worker.lastname.trim()} ${worker.firstname.trim()} ${worker.fatherName.trim()}`, ))
        }
    }

    for(let worker of workers){
        await pool.query(`INSERT INTO workers(fio, user_id) VALUES($1, $2)
            `, [`${worker.lastname.trim()} ${worker.firstname.trim()} ${worker.fatherName.trim()}`, req.user.id])
    }
   
    return res.status(200).json({
        success: true, 
        data: "Kiritildi"
    })    
})

// get all worker
exports.getAllworker = asyncHandler(async (req, res, next) => {
    let workers = null
    if(req.user.adminstatus){
        workers = await pool.query(`
            SELECT workers.FIO, workers.id, users.username 
            FROM workers
            JOIN users ON workers.user_id = users.id
            WHERE users.id = $1
        `, [req.params.id])
    }
    else if(!req.user.adminstatus){
        workers = await pool.query(`SELECT * FROM workers WHERE user_id = $1`, [req.user.id])
    }
    return res.status(200).json({
        success: true,
        data: workers.rows
    })
})

// get element by id 
exports.getElementById = asyncHandler(async (req, res, next) => {
    let worker = null
    if(req.user.adminstatus){
        worker = await pool.query(`
            SELECT workers.fio, workers.id, users.username
            FROM workers
            JOIN users ON workers.user_id = users.id
            WHERE workers.id = $1
        `, [req.params.id])
    }
    else if(!req.user.adminstatus){
        worker = await pool.query(`SELECT fio, id FROM workers WHERE id = $1
            `, [req.params.id])
    }
    res.status(200).json({
        success: true,
        data: worker.rows[0]
    })
})

// get all batalyons
exports.getAllBatalyon = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1 AND username NOT IN ($2, $3, $4)
    `, [false,"Toshkent Shahar IIBB", "98162", "98157"])
    
    res.status(200).json({
        success: true,
        data: batalyons.rows
    })
})

// update workers 
exports.updateWorker = asyncHandler(async (req, res, next) => {
    const worker = await pool.query(`SELECT fio FROM workers WHERE id = $1`, [req.params.id])
    if(req.user.adminstatus){
        const {batalyon, lastname, firstname, fatherName} = req.body
        if(!lastname || !firstname || !fatherName, !batalyon) {
            return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
        }
        const test = checkUsername(lastname.trim(), firstname.trim(), fatherName.trim())
        if(!test.lastname || !test.firstname || !test.fatherName){
            return next(new ErrorResponse("Isim Familya Ochistva bosh harifda bolishi zarur", 400))
        }

        const batalyonId = await pool.query(`SELECT id FROM users WHERE username = $1`, [batalyon])
        if(!batalyonId.rows[0]){
            return next(new ErrorResponse("Batalyon topilmadi server xatolik", 400))
        }

        if(worker.rows[0].fio !== `${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`){
            const testFIO = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2
                `, [`${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, batalyonId.rows[0].id])
            
            if(testFIO.rows[0]){
                return next(new ErrorResponse(`Bu fio oldin kiritilgan : ${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, ))
            }
        }

        const updateUser = await pool.query(`
                UPDATE workers 
                SET fio = $1, user_id = $2
                WHERE id = $3
                RETURNING * 
            `, [`${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, batalyonId.rows[0].id, req.params.id])
        
        return res.status(200).json({
            success: true,
            data: updateUser.rows[0]
        })
    }
    else if(!req.user.adminstatus){
        const {lastname, firstname, fatherName} = req.body
        if(!lastname || !firstname || !fatherName) {
            return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
        }
        const test = checkUsername(lastname.trim(), firstname.trim(), fatherName.trim())
        if(!test.lastname || !test.firstname || !test.fatherName){
            return next(new ErrorResponse("Isim Familya Ochistva bosh harifda bolishi zarur", 400))
        }

        if(worker.rows[0].fio !== `${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`){
            const testFIO = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2
                `, [`${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, req.user.id])
            
            if(testFIO.rows[0]){
                return next(new ErrorResponse(`Bu fio oldin kiritilgan : ${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, ))
            }
        }

        const updateUser = await pool.query(`
                UPDATE workers 
                SET fio = $1
                WHERE id = $2
                RETURNING * 
            `, [`${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, req.params.id])
        
        return res.status(200).json({
            success: true,
            data: updateUser.rows[0]
        })
    }
})

// delete worker 
exports.deleteWorker = asyncHandler(async (req, res, next) => {
    const deleteWorker = await pool.query(`DELETE FROM workers WHERE id = $1 AND user_id = $2 RETURNING * 
        `, [req.params.id, req.user.id])
    if(!deleteWorker.rows[0]){
        return next(new ErrorResponse("server xatolik ochirilmadi", 500))
    }
    res.status(200).json({
        success: true,
        data: "Delete"
    })
})

// search worker 
exports.searchWorker = asyncHandler(async (req, res, next) => {
    const {fio} = req.body
    let worker = null
    if(!req.user.adminstatus){ 
        worker = await pool.query(`SELECT * FROM workers WHERE fio ILIKE '%' || $1 || '%' AND user_id = $2 `, [fio, req.user.id])
        return res.status(200).json({
            success: true,
            data: worker.rows
        })
    }
    worker = await pool.query(`SELECT workers.fio, workers.id, users.username FROM workers 
        JOIN users ON users.id = workers.user_id
        WHERE fio ILIKE '%' || $1 || '%' 
        `, [fio])
    return res.status(200).json({
        success: true,
        data: worker.rows
    })
})
