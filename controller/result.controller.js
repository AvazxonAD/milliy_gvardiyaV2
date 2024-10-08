const pool = require('../config/db')
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');
const xlsx = require('xlsx')

const {
    returnDate,
    returnStringDate
} = require('../utils/date.function');

// result create 
exports.resultCreate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let { date1, date2, commandDate, commandNumber } = req.body
    if (!date1 || !date2 || !commandDate || !commandNumber || typeof commandNumber !== "number") {
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }

    date1 = returnDate(date1.trim())
    date2 = returnDate(date2.trim())
    commandDate = returnDate(commandDate.trim())
    if (!date1 || !date2 || !commandDate) {
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    const battalions = await pool.query(`SELECT id FROM users WHERE user_id = $1 AND status = $2`, [req.user.id, false])
    let test = 0
    for(let battalion of battalions.rows){
        const worker_tasks = await pool.query(`SELECT * FROM worker_tasks WHERE ispay = $1 AND pay = $2 AND taskdate < $3 AND user_id = $4
            `,[true, false, date2, battalion.id])
        test+= worker_tasks.rows.length
    }

    if(test === 0){
        return next(new ErrorResponse('ushbu muddat ichida hech bir batalyon ommaviy tadbirda ishtirok etmadi yoki hali buyurtmachilar tomonidan pul otkazilmadi', 400))
    }

    const command = await pool.query(`INSERT INTO commands (date1, date2, commanddate, commandnumber) VALUES($1, $2, $3, $4) RETURNING *
        `, [date1, date2, commandDate, commandNumber])
    
    for(let battalion of battalions.rows){
        await pool.query(`
            UPDATE worker_tasks  
            SET command_id = $1, pay = $2
            WHERE ispay = $3 AND pay = $4 AND taskdate < $5 AND user_id = $6
        `, [command.rows[0].id, true, true, false, date2, battalion.id]);
    }

    return res.status(200).json({
        success: true,
        data: command.rows
    })
})


// get all commands
exports.getAllCommand = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    // SQL so'rovi orqali barcha kerakli ma'lumotlarni olish
    const commandsQuery = `
        SELECT id, commandnumber, commanddate, date1, date2
        FROM commands
        WHERE status = $1
        ORDER BY commanddate DESC
        OFFSET $2 LIMIT $3
    `;
    const commands = await pool.query(commandsQuery, [false, (page - 1) * limit, limit]);

    const result = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate);
        command.date1 = returnStringDate(command.date1)
        command.date2 = returnStringDate(command.date2)
        return command;
    });

    // Jami ma'lumotlar sonini olish
    const totalQuery = `
        SELECT COUNT(id) AS total
        FROM commands
        WHERE status = $1
    `;
    const total = await pool.query(totalQuery, [false]);

    return res.status(200).json({
        success: true,
        pageCount: Math.ceil(total.rows[0].total / limit),
        count: total.rows[0].total,
        currentPage: page,
        nextPage: Math.ceil(total.rows[0].total / limit) < page + 1 ? null : page + 1,
        backPage: page === 1 ? null : page - 1,
        data: result
    });
});

// get battalion and workers 
exports.getBattalionAndWorkers = asyncHandler(async (req, res, next) => {
    const command = await pool.query(`SELECT id, commandnumber, commanddate, date1, date2  FROM commands WHERE id = $1`, [req.params.id])
    let resultCommand  = command.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate)
        command.date1 = returnStringDate(command.date1)
        command.date2 = returnStringDate(command.date2)
        return command  
    })
    const percent = req.query.percent / 100 || 1

    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1 AND status = $2 AND user_id = $3
    `, [false, false, req.user.id])
    
        let result = []
    
    for(let battalion of batalyons.rows){
        const workers = await pool.query(`
            SELECT worker_name, 
            ROUND((SUM(summa) * $1)::numeric, 0) AS allSumma
            FROM worker_tasks 
            WHERE command_id = $2 AND user_id = $3
            GROUP BY worker_name
            ORDER BY worker_name
        `,[percent, req.params.id, battalion.id])
        const allsumma = await pool.query(`
            SELECT ROUND((SUM(summa) * $1)::numeric, 0) AS allSumma
            FROM worker_tasks 
            WHERE command_id = $2 AND user_id = $3
        `,[percent, req.params.id, battalion.id])

        if(workers.rows.length !== 0){
            result.push({batalyonName: battalion.username, allsumma: allsumma.rows[0].allsumma, workers: workers.rows})
        }
    }

    return res.status(200).json({
        success: true,
        data: result,
        command: resultCommand
    })
})

// filter by date
exports.filterByDate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    let { date1, date2 } = req.body;
    date1 = returnDate(date1);
    date2 = returnDate(date2);

    if (!date1 || !date2) {
        return next(new ErrorResponse("Sana formati noto'g'ri kiritilgan. To'g'ri format: kun.oy.yil. Masalan: 12.12.2024", 400));
    }

    // Ma'lumotlarni olish uchun SQL so'rovi
    const commands = await pool.query(
        `SELECT id, commandnumber, commanddate, date1, date2
         FROM commands
         WHERE status = $1 AND commanddate BETWEEN $2 AND $3 AND user_id = $4`,
        [false, date1, date2, req.user.id]
    );

    // Natijalarni formatlash
    const result = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate);
        command.date1 = returnStringDate(command.date1)
        command.date2 = returnStringDate(command.date2)
        return command;
    });

    return res.status(200).json({
        success: true,
        data: result
    });
});


// create excel 
exports.createExcel = asyncHandler(async (req, res, next) => {
    const command = await pool.query(`SELECT id, commandnumber, commanddate, date1, date2  FROM commands WHERE id = $1`, [req.params.id])
    let resultCommand  = command.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate)
        command.date1 = returnStringDate(command.date1)
        command.date2 = returnStringDate(command.date2)
        return command  
    })
    const percent = req.query.percent / 100 || 1

    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1 AND status = $2 AND user_id = $3
    `, [false, false, req.user.id])
    
        let result = []
    
    for(let battalion of batalyons.rows){
        const workers = await pool.query(`
            SELECT worker_name, 
            ROUND((SUM(summa) * $1)::numeric, 0) AS allSumma
            FROM worker_tasks 
            WHERE command_id = $2 AND user_id = $3
            GROUP BY worker_name
            ORDER BY worker_name
        `,[percent, req.params.id, battalion.id])
        const allsumma = await pool.query(`
            SELECT ROUND((SUM(summa) * $1)::numeric, 0) AS allSumma
            FROM worker_tasks 
            WHERE command_id = $2 AND user_id = $3
        `,[percent, req.params.id, battalion.id])

        if(workers.rows.length !== 0){
            result.push({batalyonName: battalion.username, allsumma: allsumma.rows[0].allsumma, workers: workers.rows})
        }
    }
    const worksheetData = [];
    // Ma'lumotlarni to'plash
    result.forEach(batalyon => {
        batalyon.workers.forEach(worker => {
            worksheetData.push({
                'Buyruq_sana': resultCommand[0].commanddate,
                'Boshlanish_sana': resultCommand[0].date1,
                'Tugallash_sana': resultCommand[0].date2,
                'Buyruq_raqami': resultCommand[0].commandnumber,
                'Batalyon nomi': batalyon.batalyonName,
                'Batalon umumiy summa': batalyon.allsumma,
                'FIO': worker.worker_name,
                'Umumiy summa': worker.allsumma
            });
        });
    });

    // Excel faylni yaratish
    const worksheet = xlsx.utils.json_to_sheet(worksheetData, {
        header: [
            'Buyruq_sana',
            'Boshlanish_sana',
            'Tugallash_sana',
            'Buyruq_raqami',
            'Batalyon nomi',
            'Batalon umumiy summa',
            'FIO',
            'Umumiy summa'
        ]
    });

    // Ustunlar kengligini sozlash
    worksheet['!cols'] = [
        { width: 20 }, // Buyruq_sana
        { width: 20 }, // Boshlanish_sana
        { width: 20 }, // Tugallash_sana
        { width: 15 }, // Buyruq_raqami
        { width: 20 }, // Batalyon nomi
        { width: 20 }, // Batalon umumiy summa
        { width: 40 }, // FIO
        { width: 15 }  // Umumiy summa
    ];

    // Workbook yaratish
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Ma\'lumotlar');

    // Faylni bufferga yozish
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

// delete 
exports.deleteCommands = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    await pool.query(`UPDATE worker_tasks SET pay = $1, command_id = $2 WHERE command_id = $3`, [false, null, req.params.id])
    const command = await pool.query(`DELETE FROM commands WHERE id = $1 RETURNING *`, [req.params.id])
    res.status(200).json({
        success: true,
        data: command.rows
    })
})