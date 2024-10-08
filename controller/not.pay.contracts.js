const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require('../config/db');
const { returnDate } = require("../utils/date.function");
const xlsx = require('xlsx')
// not pay contracts 
exports.getAllContracts = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse('Siz admin emassiz', 403));
    }

    const resultArray = [];
    const contracts = await pool.query(`SELECT id, contractnumber, timelimit, clientname, address, allworkernumber, allmoney 
        FROM contracts WHERE ispay = $1 AND user_id = $2
    `, [false, req.user.id]);

    const battalions = await pool.query(`SELECT id, username FROM users WHERE user_id = $1 ORDER BY id`, [req.user.id])
    for (let contract of contracts.rows) {
        let object = { ...contract };
        const tasks = await pool.query(`SELECT user_id, battalionname, allmoney, workernumber FROM tasks WHERE contract_id = $1`, [object.id]);
        const batalonTasks = tasks.rows;
        const iib_tasks = await pool.query(`SELECT user_id, battalionname, allmoney, workernumber FROM iib_tasks WHERE contract_id = $1`, [object.id]);
        const iibTasks = iib_tasks.rows
        const allTasks = batalonTasks.concat(iibTasks);
        object.tasks = allTasks;
        const result = []
        for (let battalion  of battalions.rows) {
            if(!object.tasks.some(obj => obj.user_id === parseInt(battalion.id))){
                object.tasks.push({
                    user_id: parseInt(battalion.id),
                    battalionname: battalion.username,
                    allmoney: 0,
                    workernumber: 0
                })
            }
        }
        object.tasks.sort((a, b) => a.user_id - b.user_id)
        resultArray.push(object);
    }

    return res.status(200).json({
        success: true,
        data: {
            contracts: resultArray,
            battalions: battalions.rows
        }
    });
});

// filter by date 
exports.filterByDate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse('Siz admin emassiz', 403));
    }
    let  {date1, date2} = req.body
    
    if(!date1 || typeof date1 !== "string" || !date2 || typeof date2 !== "string"){
        return next(new ErrorResponse("sorovlar bo'sh qolishi mumkin emas va  matn bolishi kerak", 400))
    }
    date1 = returnDate(date1.trim())
    date2 = returnDate(date2.trim())
    if(!date1 || !date2){
        return next(new ErrorResponse('Sana notog`ri kiritildi. Tog`ri format : kun.oy.yil. Masalan: 12.12.2024', 400))
    }

    const resultArray = [];
    const contracts = await pool.query(`SELECT id, contractnumber, timelimit, clientname, address, allworkernumber, allmoney 
        FROM contracts WHERE ispay = $1 AND user_id = $2 AND contractdate BETWEEN $3 AND $4
    `, [false, req.user.id, date1, date2]);

    const battalions = await pool.query(`SELECT id, username FROM users WHERE user_id = $1 ORDER BY id`, [req.user.id])
    for (let contract of contracts.rows) {
        let object = { ...contract };
        const tasks = await pool.query(`SELECT user_id, battalionname, allmoney, workernumber FROM tasks WHERE contract_id = $1`, [object.id]);
        const batalonTasks = tasks.rows;
        const iib_tasks = await pool.query(`SELECT user_id, battalionname, allmoney, workernumber FROM iib_tasks WHERE contract_id = $1`, [object.id]);
        const iibTasks = iib_tasks.rows
        const allTasks = batalonTasks.concat(iibTasks);
        object.tasks = allTasks;
        const result = []
        for (let battalion  of battalions.rows) {
            if(!object.tasks.some(obj => obj.user_id === parseInt(battalion.id))){
                object.tasks.push({
                    user_id: parseInt(battalion.id),
                    battalionname: battalion.username,
                    allmoney: 0,
                    workernumber: 0
                })
            }
        }
        object.tasks.sort((a, b) => a.user_id - b.user_id)
        resultArray.push(object);
    }

    return res.status(200).json({
        success: true,
        data: {
            contracts: resultArray,
            battalions: battalions.rows
        }
    });
})

// import to excel 
exports.importToExcel = asyncHandler(async (req, res, next) => {
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
})