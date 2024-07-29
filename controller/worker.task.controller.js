const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require("../config/db");
const xlsx = require('xlsx')

const {
    returnDate,
    returnStringDate,
    returnLocalDate
} = require('../utils/date.function')

const {
    getWorkerAllMoney,
    sumMoney
} = require('../utils/worker.tasks.function')

// push worker
exports.pushWorker = asyncHandler(async (req, res, next) => {
    const { workers } = req.body;

    const taskResult = await pool.query(
        `SELECT * FROM tasks WHERE id = $1 AND battalionname = $2`,
        [req.params.id, req.user.username]
    );
    const task = taskResult.rows[0];
    if (!task || task.notdone || task.done) {
        return next(new ErrorResponse('Bu topshiriq vaqtida bajarilmagan yoki allaqachon bajarilgan', 400));
    }

    for(let worker of workers){
        if(typeof worker.tasktime !== "number" || worker.tasktime < 1){
            return next(new ErrorResponse("ommaviy tadbir vaqtini tog'ri kiriting", 400))
        }
        if(task.timelimit){
            if(worker.tasktime !== task.timelimit){
                return next(new ErrorResponse(`Bu xodim ${worker.fio} uchun notogri vaqt kiritdinggiz : ${worker.tasktime}. OMMAVIY TADBIR OTKIZALIDAN VAQT  : ${task.timelimit}`, 400))   
            }
        }
        const date = returnDate(worker.taskdate)
        if(!date){
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
        }
        const testFor = new Date(task.taskdate)
        testFor.setDate(testFor.getDate() + 1)
        if(date > testFor){
            return next(new ErrorResponse(`Bu ${worker.fio} xodim uchun topshiriq sanasini notog'ri kiritdinggiz : ${returnStringDate(date)}`, 400))
        }
    }

    let testTime = 0
    for(let worker of workers){
        testTime += worker.tasktime
    }

    let remainingTime = await pool.query(`SELECT SUM(tasktime) AS tasktime FROM worker_tasks WHERE task_id = $1`, [task.id])
    
    if(testTime > ((task.tasktime * task.workernumber) - remainingTime.rows[0].tasktime)){
        return next(new ErrorResponse(`Ushbu topshiriq uchun kiritiladigan vaqtning qoldig'i ${(task.tasktime * task.workernumber) - remainingTime.rows[0].tasktime}`, 400))
    }

    for(let worker of workers){
        if(!worker.fio){
            return next(new ErrorResponse("Fio topilmadi", 500))
        }
        const fio = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2`, [worker.fio, req.user.id])
        if(!fio.rows[0]){
            return next(new ErrorResponse("Fio topilmadi", 500))
        }
    }

    const contractResult = await pool.query(
        `SELECT ispay, address FROM contracts WHERE id = $1`,
        [task.contract_id]
    );
    const contract = contractResult.rows[0];

    for (let worker of workers) {
        const summa = sumMoney(task.discount, task.timemoney, worker.tasktime)
        date = returnDate(worker.taskdate)
        await pool.query(
            `INSERT INTO worker_tasks (contract_id, tasktime, summa, taskdate, clientname, ispay, onetimemoney, address, task_id, worker_name, user_id, discount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                task.contract_id,
                worker.tasktime,
                summa.summa,
                date,
                task.clientname,
                contract.ispay,
                summa.timemoney,
                contract.address,
                task.id,
                worker.fio,
                req.user.id,
                task.discount
            ]
        );
    }
    remainingTime = await pool.query(`SELECT SUM(tasktime) AS tasktime FROM worker_tasks WHERE task_id = $1`, [task.id])
    
    if(((task.tasktime * task.workernumber) - remainingTime.rows[0].tasktime) === 0){
        await pool.query(
            `UPDATE tasks SET inprogress = $1, done = $2, notdone = $3 WHERE id = $4`,
            [false, true, false, req.params.id]
        );
    }

    return res.status(200).json({
        success: true,
        data: "Xodimlar jalb etildi"
    });
});

// get all tasks of worker 
exports.getAlltasksOfWorker = asyncHandler(async (req, res, next) => {
    const worker = await pool.query(`SELECT fio FROM workers WHERE id = $1`, [req.params.id])

    const tasks = await pool.query(`SELECT taskdate, summa, clientname, pay, address 
        FROM worker_tasks WHERE worker_name = $1`, [worker.rows[0].fio])
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
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const worker = await pool.query(`SELECT fio FROM workers WHERE id = $1`, [req.params.id])
    let { date1, date2 } = req.body
    date1 = returnDate(date1)
    date2 = returnDate(date2)
    if (!date1 || !date2) {
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    const tasks = await pool.query(`SELECT  taskdate, summa, clientname, pay, address  
        FROM worker_tasks 
        WHERE worker_name = $1 AND taskdate BETWEEN $2 AND $3
        `, [worker.rows[0].fio, date1, date2])

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
            Tolangan_summa: paySumma.rows[0].sum ? Math.round((paySumma.rows[0].sum * 0.25) * 100) / 100 : 0,
            Tolanmagan_summa: noyPaySumma.rows[0].sum ? Math.round((noyPaySumma.rows[0].sum * 0.25) * 100) / 100 : 0,
            Umumiy_summa: summa.rows[0].sum ? Math.round((summa.rows[0].sum * 0.25) * 100) / 100 : 0
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

    const buffer = xlsx.write(workbook, { type: 'buffer' });

    // Faylni ma'lumotlar bazasiga saqlash
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

//for  excel create page 
exports.forExcelCreatePage = asyncHandler(async (req, res, next) => {
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
    return res.status(200).json({
        success: true,
        data: resultArray
    })
})

// filter date 
