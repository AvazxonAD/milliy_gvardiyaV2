const pool = require('../config/db')
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');
const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')

const {
    returnDate,
    returnStringDate
} = require('../utils/date.function');

const {
    returnSumma
} = require('../utils/result.function')

// result create 
exports.resultCreate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let { date1, date2, commandDate, commandNumber } = req.body
    if (!date1 || !date2 || !commandDate || !commandNumber || typeof commandNumber !== "number") {
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }

    date1 = returnDate(date1)
    date2 = returnDate(date2)
    commandDate = returnDate(commandDate)
    if (!date1 || !date2 || !commandDate) {
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }
 
    const worker_tasks = await pool.query(`SELECT * FROM worker_tasks WHERE ispay = $1 AND pay = $2 AND taskdate BETWEEN $3 AND $4 
        `,[true, false, date1, date2])
    if(worker_tasks.rows.length < 1){
        return next(new ErrorResponse('ushbu muddat ichida hech bir batalyon ommaviy tadbirda ishtirok etmadi', 400))
    }

    const command = await pool.query(`INSERT INTO commands (date1, date2, commanddate, commandnumber) VALUES($1, $2, $3, $4) RETURNING *
        `, [date1, date2, commandDate, commandNumber])
    
    await pool.query(`
        UPDATE worker_tasks  
        SET commandid = $1, pay = $2
        WHERE ispay = $3 AND pay = $4 AND taskdate BETWEEN $5 AND $6
    `, [command.rows[0].id, true, true, false, date1, date2]);

    return res.status(200).json({
        success: true,
        data: command.rows
    })
})

// get battalion and workers 
exports.getBattalionAndWorkers = asyncHandler(async (req, res, next) => {
    const command = await pool.query(`SELECT id, commandnumber, commanddate, date1, date2  FROM commands WHERE id = $1`, [req.params.id])
    let resultCommand  = command.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate)
        command.date1 = returnStringDate(command.date1)
        command.date2 = returnStringDate(command.date2)
        return command  
    })

    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1 AND username NOT IN ($2, $3, $4)
    `, [false,"Toshkent Shahar IIBB", "98162", "98157"])
    
        let result = []

    for(let battalion of batalyons.rows){
        const workers = await pool.query(`SELECT DISTINCT(worker_name), SUM(summa) AS allSumma
            FROM worker_tasks 
            WHERE commandid = $1 AND pay = $2 AND ispay = $3 AND  user_id = $4 
            GROUP BY worker_name
            `,[req.params.id, true, true, battalion.id])

        if(workers.rows.length > 1){
            result.push({batalyonName: battalion.username, workers: workers.rows})
        }
    }
    return res.status(200).json({
        success: true,
        data: result,
        command: resultCommand
    })
})

// get all commands 
exports.getAllCommand = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const limit = parseInt(req.query.limit) || 10 
    const page = parseInt(req.query.page) || 1

    const commands =  await pool.query(`SELECT id, commandnumber, commanddate FROM commands WHERE status = $1 OFFSET $2 LIMIT $3 `, [false, (page - 1) * limit, limit])
    let result  = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate)
        return command  
    })

    const total = await pool.query(`SELECT COUNT(id) AS total FROM commands WHERE status = $1`, [false])
    
    return res.status(200).json({
        success: true,
        pageCount: Math.ceil(total.rows[0].total / limit),
        count: total.rows[0].total,
        currentPage: page,
        nextPage: Math.ceil(total.rows[0].total / limit) < page + 1 ? null : page + 1,
        backPage: page === 1 ? null : page - 1,
        data: result
    })

})

// filter by date 
exports.filterByDate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let {date1, date2} = req.body
    date1 = returnDate(date1)
    date2 = returnDate(date2)
    if(!date1 || !date2){
       return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    const commands =  await pool.query(`SELECT id, commandnumber, commanddate FROM commands WHERE status = $1 AND commanddate BETWEEN $2 AND $3
        `, [false, date1, date2])
    let result  = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate)
        return command  
    })

    return res.status(200).json({
        success: true,
        data: result
    })
})


exports.createExcel = asyncHandler(async (req, res, next) => {
    const { data } = req.body;
    const filePath = path.join(__dirname, '..', 'public', 'uploads');

    // Fayl katalogining mavjudligini tekshirish va kerak bo'lsa yaratish
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
    }

    const command = await pool.query(`SELECT * FROM commands WHERE id = $1`, [req.params.id]);

    // Excel uchun jadvalni tayyorlash
    const worksheetData = [];

    // Ma'lumotlar
    data.forEach(batalyon => {
        batalyon.workers.forEach(worker => {
            worksheetData.push({
                'Buyruq_sana': returnStringDate(command.rows[0].commanddate),
                'Boshlanish_sana': returnStringDate(command.rows[0].date1),
                'Tugallash_sana': returnStringDate(command.rows[0].date2),
                'Buyruq_raqami': command.rows[0].commandnumber,
                'Batalyon nomi': batalyon.batalyonName,
                'Ishchi nomi': worker.worker_name,
                'Umumiy summa': worker.allsumma
            });
        });
    });

    const worksheet = xlsx.utils.json_to_sheet(worksheetData, {
        header: [
            'Buyruq_sana',
            'Boshlanish_sana',
            'Tugallash_sana',
            'Buyruq_raqami',
            'Batalyon nomi',
            'Ishchi nomi',
            'Umumiy summa'
        ]
    });

    worksheet['!cols'] = [
        { wch: 20 }, // Buyruq_sana
        { wch: 20 }, // Boshlanish_sana
        { wch: 20 }, // Tugallash_sana
        { wch: 15 }, // Buyruq_raqami
        { wch: 20 }, // Batalyon nomi
        { wch: 40 }, // Ishchi nomi
        { wch: 15 }  // Umumiy summa
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Ma\'lumotlar');

    // Fayl nomini generatsiya qilish
    const filename = `${Date.now()}_data.xlsx`;
    const outputPath = path.join(filePath, filename);

    try {
        // Faylni yozish
        xlsx.writeFile(workbook, outputPath);

        // Faylni yuklab olish
        res.download(outputPath, filename, (err) => {
            if (err) {
                console.error('Faylni yuklab olishda xatolik:', err);
                res.status(500).send('Faylni yuklab olishda xatolik yuz berdi');
            } else {
                console.log('Fayl muvaffaqiyatli yuklab olindi');
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Faylni yaratishda xatolik yuz berdi",
            error: err.message
        });
    }
});