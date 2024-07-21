const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const checkUsername = require('../utils/checkUserName');
const pool = require("../config/db");
const xlsx = require('xlsx')

exports.create = asyncHandler(async (req, res, next) => {
    const { workers } = req.body
    for (let worker of workers) {
        if (!worker.lastname || !worker.firstname || !worker.fatherName) {
            return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
        }

        const test = checkUsername(`${worker.lastname.trim()} ${worker.firstname.trim()} ${worker.fatherName.trim()}`)
        if (!test) {
            return next(new ErrorResponse("Isim Familya Ochistva imloviy xatolarsiz ", 400))
        }

        const testFIO = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2
            `, [`${worker.lastname.trim()} ${worker.firstname.trim()} ${worker.fatherName.trim()}`, req.user.id])
        if (testFIO.rows[0]) {
            return next(new ErrorResponse(`Bu fio oldin kiritilgan : ${worker.lastname.trim()} ${worker.firstname.trim()} ${worker.fatherName.trim()}`,))
        }
    }

    for (let worker of workers) {
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
    const limit = parseInt(req.query.limit) || 10
    const page = parseInt(req.query.page) || 1

    let workers = null
    let total
    if (req.user.adminstatus) {
        workers = await pool.query(`
            SELECT workers.FIO, workers.id, users.username 
            FROM workers
            JOIN users ON workers.user_id = users.id
            WHERE users.id = $1
            ORDER BY fio ASC
            OFFSET $2
            LIMIT $3
        `, [req.params.id, (page - 1) * limit, limit])
        total = await pool.query(`SELECT COUNT(id) AS total FROM workers WHERE user_id = $1`, [req.params.id])
    }
    else if (!req.user.adminstatus) {
        workers = await pool.query(`SELECT * FROM workers 
            WHERE user_id = $1
            OFFSET $2
            LIMIT $3
        `, [req.user.id, (page - 1) * limit, limit])
        total = await pool.query(`SELECT COUNT(id) AS total FROM workers WHERE user_id = $1`, [req.user.id])
    }

    return res.status(200).json({
        success: true,
        pageCount: Math.ceil(total.rows[0].total / limit),
        count: total.rows[0].total,
        currentPage: page,
        nextPage: Math.ceil(total.rows[0].total / limit) < page + 1 ? null : page + 1,
        backPage: page === 1 ? null : page - 1,
        data: workers.rows
    })
})

// get element by id 
exports.getElementById = asyncHandler(async (req, res, next) => {
    let worker = null
    if (req.user.adminstatus) {
        worker = await pool.query(`
            SELECT workers.fio, workers.id, users.username
            FROM workers
            JOIN users ON workers.user_id = users.id
            WHERE workers.id = $1
        `, [req.params.id])
    }
    else if (!req.user.adminstatus) {
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
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1 AND username NOT IN ($2, $3, $4) ORDER BY username ASC
    `, [false, "Toshkent Shahar IIBB", "98162", "98157"])

    res.status(200).json({
        success: true,
        data: batalyons.rows
    })
})

// update workers 
exports.updateWorker = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const worker = await pool.query(`SELECT fio FROM workers WHERE id = $1`, [req.params.id])
    if (req.user.adminstatus) {
        const { batalyon, lastname, firstname, fatherName } = req.body
        if (!lastname || !firstname || !fatherName, !batalyon) {
            return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
        }
        const test = checkUsername(lastname.trim(), firstname.trim(), fatherName.trim())
        if (!test.lastname || !test.firstname || !test.fatherName) {
            return next(new ErrorResponse("Isim Familya Ochistva bosh harifda bolishi zarur", 400))
        }

        const batalyonId = await pool.query(`SELECT id FROM users WHERE username = $1`, [batalyon])
        if (!batalyonId.rows[0]) {
            return next(new ErrorResponse("Batalyon topilmadi server xatolik", 400))
        }

        if (worker.rows[0].fio !== `${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`) {
            const testFIO = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2
                `, [`${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, batalyonId.rows[0].id])

            if (testFIO.rows[0]) {
                return next(new ErrorResponse(`Bu fio oldin kiritilgan : ${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`,))
            }
        }

        const updateUser = await pool.query(` UPDATE workers SET fio = $1, user_id = $2 WHERE id = $3 RETURNING * 
        `, [`${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, batalyonId.rows[0].id, req.params.id])

        return res.status(200).json({
            success: true,
            data: updateUser.rows[0]
        })
    }
    else if (!req.user.adminstatus) {
        const { lastname, firstname, fatherName } = req.body
        if (!lastname || !firstname || !fatherName) {
            return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
        }
        const test = checkUsername(lastname.trim(), firstname.trim(), fatherName.trim())
        if (!test.lastname || !test.firstname || !test.fatherName) {
            return next(new ErrorResponse("Isim Familya Ochistva bosh harifda bolishi zarur", 400))
        }

        if (worker.rows[0].fio !== `${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`) {
            const testFIO = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2
                `, [`${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`, req.user.id])

            if (testFIO.rows[0]) {
                return next(new ErrorResponse(`Bu fio oldin kiritilgan : ${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`,))
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
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    if (!req.user.adminstatus) {
        const deleteWorker = await pool.query(`DELETE FROM workers WHERE id = $1 AND user_id = $2 RETURNING * 
            `, [req.params.id, req.user.id])
        if (!deleteWorker.rows[0]) {
            return next(new ErrorResponse("server xatolik ochirilmadi", 500))
        }
    }
    const deleteWorker = await pool.query(`DELETE FROM workers WHERE id = $1 RETURNING * 
        `, [req.params.id])
    if (!deleteWorker.rows[0]) {
        return next(new ErrorResponse("server xatolik ochirilmadi", 500))
    }
    res.status(200).json({
        success: true,
        data: "Delete"
    })
})

// search worker 
exports.searchWorker = asyncHandler(async (req, res, next) => {
    
    const { fio } = req.body
    let worker = null
    if (!req.user.adminstatus) {
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

exports.createExcel = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let workers = null
    if(req.query.battalion){
        workers = await pool.query(` SELECT workers.fio, users.username  FROM workers JOIN users ON workers.user_id = users.id WHERE users.id = $1`, [req.query.id]);
    }else{
        workers = await pool.query(` SELECT workers.fio, users.username FROM workers JOIN users ON workers.user_id = users.id`);
    }

    // Excel faylni yaratish
    const worksheetData = [];

    // Ma'lumotlar qismi
    z.rows.forEach(data => {
        worksheetData.push({
            'Xodim': data.fio,
            'Batalyon': data.username
        });
    });

    const worksheet = xlsx.utils.json_to_sheet(worksheetData);

    // Ustunlar kengligini sozlash
    worksheet['!cols'] = [
        { width: 80 },
        { width: 80 },
    ];

    // Workbook yaratish
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Xodimlar');

    // Faylni yozish
    const buffer = xlsx.write(workbook, { type: 'buffer' });

    // Faylni ma'lumotlar bazasiga saqlash
    const filename = `${Date.now()}_data.xlsx`;

    await pool.query(`
        INSERT INTO files (filename, file_data)
        VALUES ($1, $2)
    `, [filename, buffer]);

    const fileResult = await pool.query(`
        SELECT filename, file_data
        FROM files
        WHERE filename = $1
    `, [filename]);

    if (fileResult.rows.length === 0) {
        return res.status(404).json({ message: 'Fayl topilmadi' });
    }

    // Faylni yuklab olish
    const { file_data } = fileResult.rows[0];
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(file_data);
});

// import excel data create 
exports.importExcel = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        req.flash('error', 'Fayl yuklanmadi yoki tanlanmadi');
        return res.redirect('/sms/page');
    }

    const fileBuffer = req.file.buffer;

    // Excel faylini o'qish
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let data = xlsx.utils.sheet_to_json(sheet);

    const datas = data.map(row => {
        const newRow = {};
        for (let key in row) {
            const newKey = key.trim();
            newRow[newKey] = row[key];
        }
        return newRow;
    });

    for(data of datas){
        if(!data.fio){
            return next(new ErrorResponse(`sorovlar boshh qolishi mumkin emas. Excel fileni tekshiring`, 400))
        }
        if(typeof data.fio !== "string"){
            return next(new ErrorResponse(`malumotlar text formatida bolishi kerak excel fileni tekshiring. Xato sababchisi : ${data.fio}`, 400))
        }
        const fio = await pool.query(`SELECT * FROM workers WHERE user_id = $1 AND fio = $2`, [req.user.id, data.fio.trim()])
        if(fio.rows[0]){
            return next(new ErrorResponse(`Bu xodim avval kiritilgan: ${data.fio}`, 400))
        }

        const test = checkUsername(data.fio)
        if(!test){
            return next(new ErrorResponse(`familya isim sharif tog'ri imloviy xatolarsiz toliq kiriting. Xatolik sababchisi: ${data.fio}`))
        }
    }

    for(let data of datas){
        await pool.query(`INSERT INTO workers (fio, user_id) VALUES($1, $2)`, [data.fio, req.user.id])
    }

    return res.status(201).json({
        success: true,
        data: "Kiritildi"
    })
})

