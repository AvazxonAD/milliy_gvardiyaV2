const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const {checkUsername}= require('../utils/checkUserName');
const pool = require("../config/db");
const xlsx = require('xlsx');
const { returnStringDate } = require("../utils/date.function");

// create worker 
exports.create = asyncHandler(async (req, res, next) => {
    const { workers } = req.body
    if (!workers || workers.length < 1) {
        return next(new ErrorResponse('sorovlar bosh qolishi mumkin emas', 400))
    }

    for (let worker of workers) {
        if (!worker.lastname || !worker.firstname || !worker.fatherName) {
            return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
        }
        const fio = `${worker.lastname.trim().toLowerCase()} ${worker.firstname.trim().toLowerCase()} ${worker.fatherName.trim().toLowerCase()}`;

        const test = checkUsername(fio)
        if (!test) {
            return next(new ErrorResponse("Isim Familya Ochistva imloviy xatolarsiz kriting", 400))
        }

        const testFIO = await pool.query(`SELECT * FROM workers 
                WHERE user_id = $2 AND 
                regexp_replace(lower(fio), '[^\\w\\s]', '', 'g') = regexp_replace(lower($1), '[^\\w\\s]', '', 'g')`,
            [fio, req.user.id]
        );

        if (testFIO.rows.length > 0) {
            return next(new ErrorResponse(`Bu fio oldin kiritilgan: ${fio}`));
        }
    }

    const user = await pool.query(`SELECT user_id FROM users WHERE id = $1`, [req.user.id])
    const admin = await pool.query(`SELECT id FROM users WHERE id = $1`, [user.rows[0].user_id])
    for (let worker of workers) {
        const fioInsert = `${worker.lastname.trim()} ${worker.firstname.trim()} ${worker.fatherName.trim()}`;
        const fio = await pool.query(`INSERT INTO workers(fio, user_id, admin_id) VALUES($1, $2, $3) RETURNING *
            `, [fioInsert, req.user.id, admin.rows[0].id])
        if (!fio.rows[0]) {
            return next(new ErrorResponse("Server xatolik kiritilmadi", 400))
        }
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
            ORDER BY fio ASC
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
        worker = await pool.query(`SELECT fio, id FROM workers WHERE id = $1 AND user_id = $2
            `, [req.params.id, req.user.id])
    }

    if (!worker.rows[0]) {
        return next(new ErrorResponse("Xodim topilmadi", 400))
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
    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1 AND status = $2 ORDER BY username ASC
    `, [false, false])

    res.status(200).json({
        success: true,
        data: batalyons.rows
    })
})

// update workers 
exports.updateWorker = asyncHandler(async (req, res, next) => {
    const { batalyon, lastname, firstname, fatherName } = req.body

    const worker = await pool.query(`SELECT fio FROM workers WHERE id = $1`, [req.params.id])
    if (!worker.rows[0]) {
        return next(new ErrorResponse("fio topilmadi server xatolik", 400))
    }

    const fio = `${lastname.trim().toLowerCase()} ${firstname.trim().toLowerCase()} ${fatherName.trim().toLowerCase()}`;

    if (req.user.adminstatus) {
        if (!lastname || !firstname || !fatherName, !batalyon) {
            return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
        }
        const test = checkUsername(fio)
        if (!test) {
            return next(new ErrorResponse("Isim Familya Ochistva imloviy xatolarsiz kriting", 400))
        }

        const batalyonId = await pool.query(`SELECT id FROM users WHERE username = $1`, [batalyon])
        if (!batalyonId.rows[0]) {
            return next(new ErrorResponse("Batalyon topilmadi server xatolik", 400))
        }


        if (worker.rows[0].fio.toLowerCase() !== fio) {
            const testFIO = await pool.query(`SELECT * FROM workers 
                WHERE user_id = $2 AND 
                regexp_replace(lower(fio), '[^\\w\\s]', '', 'g') = regexp_replace(lower($1), '[^\\w\\s]', '', 'g')
            `, [fio, batalyonId.rows[0].id])

            if (testFIO.rows[0]) {
                return next(new ErrorResponse(`Bu fio oldin kiritilgan : ${fio}`,))
            }
        }

        const updateUser = await pool.query(` UPDATE workers SET fio = $1, user_id = $2 WHERE id = $3 RETURNING * 
        `, [fio, batalyonId.rows[0].id, req.params.id])

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

        const test = checkUsername(`${lastname.trim()} ${firstname.trim()} ${fatherName.trim()}`)
        if (!test) {
            return next(new ErrorResponse("Isim Familya Ochistva bosh harifda bolishi zarur", 400))
        }

        if (worker.rows[0].fio.toLowerCase() !== fio) {
            const testFIO = await pool.query(`SELECT * FROM workers 
                WHERE user_id = $2 AND 
                regexp_replace(lower(fio), '[^\\w\\s]', '', 'g') = regexp_replace(lower($1), '[^\\w\\s]', '', 'g')
            `, [fio, req.user.id])

            if (testFIO.rows[0]) {
                return next(new ErrorResponse(`Bu fio oldin kiritilgan : ${fio}`,))
            }
        }

        const updateUser = await pool.query(`
                UPDATE workers 
                SET fio = $1
                WHERE id = $2
                RETURNING * 
            `, [fio, req.params.id])

        return res.status(200).json({
            success: true,
            data: updateUser.rows[0]
        })
    }
})

// delete worker 
exports.deleteWorker = asyncHandler(async (req, res, next) => {

    const worker = await pool.query('SELECT fio FROM workers WHERE id = $1', [req.params.id]);
    if (worker.rowCount === 0) {
        return next(new ErrorResponse("Xodim topilmadi", 404));
    }

    // Xodimning to‘lanmagan pullarini tekshirish
    const notPayMoney = await pool.query(`SELECT worker_tasks.taskdate, contracts.contractnumber 
        FROM worker_tasks
        JOIN contracts ON worker_tasks.contract_id = contracts.id 
        WHERE worker_tasks.worker_name = $1 AND pay = $2 AND command_id IS NULL
    `, [worker.rows[0].fio, false]);


    if (notPayMoney.rowCount > 0) {
        let result = notPayMoney.rows.map(notPay => {
            return {
                taskdate: returnStringDate(notPay.taskdate),
                contractNumber: notPay.contractnumber
            }
        })
        return res.status(400).json({
            success: false,
            notPayMoney: result,
            message: "Ushbu xodim hali qatnashgan ommaviy tadbir uchun ish haqini olmadi. Buni o‘chirishda xatoliklar yuzaga kelishi mumkin."
        });
    }

    // Xodimni o‘chirish
    const deleteWorker = await pool.query('DELETE FROM workers WHERE id = $1 RETURNING *', [req.params.id]);

    if (!deleteWorker.rows[0]) {
        return next(new ErrorResponse("Xodim o‘chirilmadi", 500));
    }

    res.status(200).json({
        success: true,
        data: "Xodim o‘chirildi"
    });
});


// search worker 
exports.searchWorker = asyncHandler(async (req, res, next) => {
    const { fio } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.adminstatus;

    if (!fio || !userId) {
        return res.status(400).json({
            success: false,
            message: 'FIO yoki user ID yo\'q'
        });
    }

    const fioTrimmed = fio.trim().toLowerCase();
    const searchPattern = `%${fioTrimmed.replace(/[\W_]+/g, '')}%`;

    let worker;

    if (!isAdmin) {
        worker = await pool.query(
            `SELECT * FROM workers 
            WHERE user_id = $2 AND 
            regexp_replace(lower(fio), '[^a-zA-Z0-9]', '', 'g') ILIKE $1`, 
            [searchPattern, userId]
        );
    } else {
        worker = await pool.query(
            `SELECT workers.fio, workers.id, users.username 
            FROM workers 
            JOIN users ON users.id = workers.user_id
            WHERE users.admin_id = $2 AND 
            regexp_replace(lower(workers.fio), '[^a-zA-Z0-9]', '', 'g') ILIKE $1`, 
            [searchPattern, userId]
        );
    }

    return res.status(200).json({
        success: true,
        data: worker.rows
    });
});

// excel file create
exports.createExcel = asyncHandler(async (req, res, next) => {
    let workers;
    if (req.user.adminstatus) {
        if (req.query.battalion) {
            workers = await pool.query(`SELECT workers.fio, users.username FROM workers JOIN users ON workers.user_id = users.id WHERE workers.user_id = $1`, [req.query.id]);
        } else {
            workers = await pool.query(`SELECT workers.fio, users.username FROM workers JOIN users ON workers.user_id = users.id WHERE admin_id = $1`, [req.user.id]);
        }
    } else {
        workers = await pool.query(`SELECT workers.fio, users.username FROM workers JOIN users ON workers.user_id = users.id WHERE users.id = $1`, [req.user.id]);
    }

    const worksheetData = workers.rows.map(data => ({
        'Xodim': data.fio,
        'Batalyon': data.username
    }));

    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [{ width: 80 }, { width: 80 }];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Xodimlar');

    const buffer = xlsx.write(workbook, { type: 'buffer' });
    const filename = `${Date.now()}_data.xlsx`;

    await pool.query(`INSERT INTO files (filename, file_data) VALUES ($1, $2)`, [filename, buffer]);

    const fileResult = await pool.query(`SELECT filename, file_data FROM files WHERE filename = $1`, [filename]);

    if (fileResult.rows.length === 0) {
        return res.status(404).json({ message: 'Fayl topilmadi' });
    }

    const { file_data } = fileResult.rows[0];
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(file_data);
});

// Excel faylni import qilish
exports.importExcel = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return next(new ErrorResponse("Fayl yuklanmadi", 400));
    }

    const fileBuffer = req.file.buffer;
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet).map(row => {
        const newRow = {};
        for (const key in row) {
            newRow[key.trim()] = row[key];
        }
        return newRow;
    });

    for (const rowData of data) {
        if (!rowData.fio) {
            return next(new ErrorResponse(`FIO bo'sh qolishi mumkin emas. Excel faylni tekshiring`, 400));
        }
        if (typeof rowData.fio !== "string") {
            return next(new ErrorResponse(`Ma'lumotlar matn formatida bo'lishi kerak. Xato sababchisi: ${rowData.fio.trim()}`, 400));
        }

        const test = checkUsername(rowData.fio.trim());
        if (!test) {
            return next(new ErrorResponse(`FIO imloviy xatolarsiz kiritilishi kerak: ${rowData.fio}`, 400));
        }
    }

    const user = await pool.query(`SELECT user_id FROM users WHERE id = $1`, [req.user.id]);
    const admin = await pool.query(`SELECT id FROM users WHERE id = $1`, [user.rows[0].user_id]);

    for (const rowData of data) {
        const fio = rowData.fio.trim();
        if (fio.toLowerCase().trim() === 'vakant' || fio.toLowerCase().trim() === 'вакант') {
            continue;
        }

        const fioResult = await pool.query(`
            SELECT * FROM workers 
            WHERE user_id = $2 AND 
            regexp_replace(lower(fio), '[^\\w\\s]', '', 'g') = regexp_replace(lower($1), '[^\\w\\s]', '', 'g')
        `, [fio, req.user.id]);

        if (fioResult.rows[0]) {
            continue;
        }

        await pool.query(`
            INSERT INTO workers (fio, user_id, admin_id) VALUES ($1, $2, $3)
        `, [fio, req.user.id, admin.rows[0].id]);
    }

    return res.status(201).json({
        success: true,
        data: "Kiritildi"
    });
});

// for push 
exports.forPush = asyncHandler(async (req, res, next) => {
    workers = await pool.query(`SELECT fio, id  FROM workers 
            WHERE user_id = $1
            ORDER BY fio ASC
        `, [req.user.id])

    return res.status(200).json({
        success: true,
        data: workers.rows
    })
})