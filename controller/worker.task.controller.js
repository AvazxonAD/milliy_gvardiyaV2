const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require("../config/db");
const path = require('path')
const xlsx = require('xlsx')
const fs = require('fs')

const {
    returnDate,
    returnStringDate
} = require('../utils/date.function')

const { 
    getWorkerAllMoney,
} = require('../utils/worker.tasks.function')

// push worker
exports.pushWorker = asyncHandler(async (req, res, next) => {
    const task = await pool.query(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id])
    if(task.rows[0].notdone || task.rows[0].done){
        return next(new ErrorResponse('bu topshiriq vaqtida bajarilmagan admin bilan bog"laning yoki allaqachon  bajarilgan topshiriq', 400))
    }

    const {workers} = req.body
    
    if(task.rows[0].workernumber !== workers.length){
        return next(new ErrorResponse(`xodimlar soni ${task.rows[0].workernumber} bolishi kerak`, 400))
    }

    for(let worker of workers){
        const test = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2`, [worker.fio, req.user.id])
        if(!test.rows[0]){
            return next(new ErrorResponse(`server xatolik xodim topilmadi: ${worker.fio}`, 403))
        }
    }

    for(let worker of workers){
        let contract = await pool.query(`SELECT ispay, address FROM contracts WHERE id = $1`, [task.rows[0].contract_id])
        let ispay = contract.rows[0].ispay
        const id = await pool.query(`SELECT id, fio FROM workers WHERE fio = $1 AND user_id = $2`, [worker.fio, req.user.id])
        await pool.query(`
            INSERT INTO worker_tasks (worker_id,  contract_id, tasktime, summa, taskdate, clientname, ispay, onetimemoney, address, task_id, worker_name, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                id.rows[0].id,
                task.rows[0].contract_id, 
                task.rows[0].tasktime, 
                task.rows[0].allmoney / task.rows[0].workernumber,
                task.rows[0].taskdate,
                task.rows[0].clientname,
                ispay,
                (task.rows[0].allmoney / task.rows[0].workernumber) / task.rows[0].tasktime,
                contract.rows[0].address,
                task.rows[0].id,
                id.rows[0].fio,
                req.user.id
            ])
        await pool.query(`UPDATE tasks SET inprogress = $1, done = $2, notdone = $3
            WHERE id = $4
            `,[false, true, false, req.params.id] )
    }
    return res.status(200).json({
        success: true,
        data: "xodimlar jalb etildi"
    })
})

// get all tasks of worker 
exports.getAlltasksOfWorker = asyncHandler(async (req, res, next) => {
    const worker = await pool.query(`SELECT fio FROM workers WHERE id = $1`, [req.params.id])

    const tasks = await pool.query(`SELECT taskdate, onetimemoney, tasktime, summa, clientname, ispay, address 
        FROM worker_tasks WHERE worker_id = $1`, [req.params.id])
    let result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate)
        return task
    })
    const allmoney = getWorkerAllMoney(tasks.rows)
    return res.status(200).json({
        success: true,
        data: result,
        allmoney,
        worker: worker.rows
    })

})

// filter by date 
exports.filterByDate = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let {date1, date2} = req.body
    date1 = returnDate(date1)
    date2 = returnDate(date2)
    if(!date1 || !date2){
       return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    const tasks = await pool.query(`SELECT * FROM worker_tasks WHERE worker_id = $1 AND taskdate BETWEEN $2 AND $3`, [req.params.id, date1, date2])
    
    let result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate)
        return task
    })
    
    const allmoney = getWorkerAllMoney(tasks.rows)
    return res.status(200).json({
        success: true,
        data: result,
        allmoney
    })

})

exports.excelCreate = asyncHandler(async (req, res, next) => {
    let resultArray = [];

    // SQL so'rovi orqali ma'lumotlarni olish
    const workerNames = await pool.query(`
        SELECT worker_name
        FROM (
            SELECT worker_name, SUM(summa) AS total_sum
            FROM worker_tasks
            GROUP BY worker_name
        ) AS worker_sums
        ORDER BY total_sum ASC;
    `);

    // Har bir ishchi uchun ma'lumotlarni to'plash
    for (let worker of workerNames.rows) {
        const paySumma = await pool.query(`
            SELECT SUM(summa) FROM worker_tasks WHERE worker_name = $1 AND pay = $2
        `, [worker.worker_name, true]);

        const noyPaySumma = await pool.query(`
            SELECT SUM(summa) FROM worker_tasks WHERE worker_name = $1 AND pay = $2
        `, [worker.worker_name, false]);

        const summa = await pool.query(`
            SELECT SUM(summa) FROM worker_tasks WHERE worker_name = $1
        `, [worker.worker_name]);

        // Ma'lumotlarni resultArray ga qo'shish
        resultArray.push({
            Xodim: worker.worker_name,
            Tolangan_summa: paySumma.rows[0].sum !== null ? paySumma.rows[0].sum : 0,
            Tolanmagan_summa: noyPaySumma.rows[0].sum !== null ? noyPaySumma.rows[0].sum : 0,
            Umumiy_summa: summa.rows[0].sum !== null ? summa.rows[0].sum : 0
        });
    }

    // Excel faylni yaratish
    const worksheetData = [];
    
    // Ma'lumotlar qismi
    resultArray.forEach(data => {
        worksheetData.push({
            'Xodim': data.Xodim,
            'Tolangan_summa': data.Tolangan_summa.toString(), // toString() ishlatilishi mumkin
            'Tolanmagan_summa': data.Tolanmagan_summa.toString(),
            'Umumiy_summa': data.Umumiy_summa.toString()
        });
    });

    const worksheet = xlsx.utils.json_to_sheet(worksheetData);

    // Ustunlar kengligini sozlash
    worksheet['!cols'] = [
        { width: 80 }, // Xodim
        { width: 40 }, // Tolangan_summa
        { width: 40 }, // Tolanmagan_summa
        { width: 40 }  // Umumiy_summa
    ];

    // Workbook yaratish
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Xodimlar'); // 'Xodimlar' nomli sahifani qo'shish

    // Fayl nomini generatsiya qilish
    const filename = `${Date.now()}_data.xlsx`;
    const filePath = path.join(__dirname, '..', 'public', 'uploads');
    const outputPath = path.join(filePath, filename);

    // Faylni yozish
    xlsx.writeFile(workbook, outputPath);

    // Faylni yuklab olish
    res.download(outputPath, filename, (err) => {
        if (err) {
            console.error('Faylni yuklab olishda xatolik:', err);
            res.status(500).send('Faylni yuklab olishda xatolik yuz berdi');
        } else {
            console.log('Fayl muvaffaqiyatli yuklab olindi');
            // Faylni yaratilganidan so'ng uni o'chirish uchun
            fs.unlinkSync(outputPath);
        }
    });
});