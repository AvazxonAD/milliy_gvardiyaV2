const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require("../config/db");

const {
    returnDate,
    returnStringDate,
} = require('../utils/date.function')

const {
    getWorkerAllMoney,
    sumMoney
} = require('../utils/worker.tasks.function')

// push worker 
exports.pushWorker = asyncHandler(async (req, res, next) => {
    const { workers, taskdate, tasktime } = req.body;
    console.log(req.body)

    const taskResult = await pool.query(
        `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
    );

    const task = taskResult.rows[0];
    if (!task || task.notdone || task.done) {
        return next(new ErrorResponse('Bu topshiriq vaqtida bajarilmagan yoki allaqachon bajarilgan', 400));
    }

    if (typeof tasktime !== "number" || tasktime < 1) {
        return next(new ErrorResponse("ommaviy tadbir vaqtini tog'ri kiriting", 400));
    }
    const date = returnDate(taskdate);
    if (!date) {
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400));
    }
    const testFor = new Date(task.taskdate);
    testFor.setDate(testFor.getDate() + 1);
    if (date > testFor) {
        return next(new ErrorResponse(`Topshiriq sanasini notog'ri kiritdinggiz : ${returnStringDate(date)}`, 400));
    }

    let testTime = Math.round((workers.length * tasktime) * 100) / 100

    let remainingTimeResult = await pool.query(`SELECT ROUND(SUM(tasktime)::numeric, 2) AS tasktime FROM worker_tasks WHERE task_id = $1`, [task.id]);
    let remainingTime = parseFloat(remainingTimeResult.rows[0].tasktime) || 0;
    const time = parseFloat(((task.tasktime * task.workernumber) - remainingTime).toFixed(2));
    if (testTime > time) {
        return next(new ErrorResponse(`Ushbu topshiriq uchun kiritiladigan vaqtning qoldig'i ${time}`, 400));
    }

    for (let worker of workers) {
        if (!worker.id) {
            return next(new ErrorResponse("Fio topilmadi", 500));
        }
        const fio = await pool.query(`SELECT * FROM workers WHERE id = $1 AND user_id = $2`, [worker.id, req.user.id]);
        if (!fio.rows[0]) {
            return next(new ErrorResponse("Fio topilmadi", 500));
        }
    }

    const contractResult = await pool.query(
        `SELECT ispay, address, contractnumber FROM contracts WHERE id = $1`,
        [task.contract_id]
    );
    const contract = contractResult.rows[0];

    for (let worker of workers) {
        const summa = sumMoney(task.discount, task.timemoney, tasktime);
        const date = returnDate(taskdate);
        const fio = await pool.query(`SELECT * FROM workers WHERE id = $1 AND user_id = $2`, [worker.id, req.user.id]);
        await pool.query(
            `INSERT INTO worker_tasks (contract_id, tasktime, summa, taskdate, clientname, ispay, onetimemoney, address, task_id, worker_name, user_id, discount, contractnumber, worker_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                task.contract_id,
                tasktime,
                summa.summa,
                date,
                task.clientname,
                contract.ispay,
                summa.timemoney,
                contract.address,
                task.id,
                fio.rows[0].fio,
                req.user.id,
                task.discount,
                contract.contractnumber,
                fio.rows[0].id
            ]
        );
    }

    remainingTimeResult = await pool.query(`SELECT ROUND(SUM(tasktime)::numeric, 2) AS tasktime FROM worker_tasks WHERE task_id = $1`, [task.id]);
    remainingTime = parseFloat(remainingTimeResult.rows[0].tasktime) || 0;
    const resultTime = parseFloat(((task.tasktime * task.workernumber) - remainingTime).toFixed(2));
    if (resultTime === 0) {
        await pool.query(
            `UPDATE tasks SET inprogress = $1, done = $2, notdone = $3 WHERE id = $4`,
            [false, true, false, req.params.id]
        );
    }

    return res.status(200).json({
        success: true,
        data: task.id
    });
});

// get all tasks of worker 
exports.getAlltasksOfWorker = asyncHandler(async (req, res, next) => {
    const worker = await pool.query(`SELECT id FROM workers WHERE id = $1`, [req.params.id])

    const tasks = await pool.query(`SELECT taskdate, summa, clientname, pay, address 
        FROM worker_tasks WHERE worker_id = $1`, [worker.rows[0].id])
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