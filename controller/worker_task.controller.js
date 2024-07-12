const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require("../config/db");

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
    const {workers} = req.body
    
    if(task.rows[0].workernumber !== workers.length){
        return next(new ErrorResponse(`xodimlar soni ${task.rows[0].workernumber} bolishi kerak`, 400))
    }

    for(let worker of workers){
        const test = await pool.query(`SELECT * FROM workers WHERE fio = $1 AND user_id = $2`, [worker.fio, req.user.id])
        if(!test.rows[0]){
            return next(new ErrorResponse("server xatolik xodim topilmadi", 403))
        }
    }

    for(let worker of workers){
        let contract = await pool.query(`SELECT ispay, address FROM contracts WHERE id = $1`, [task.rows[0].contract_id])
        let ispay = contract.rows[0].ispay
        const id = await pool.query(`SELECT id FROM workers WHERE fio = $1 AND user_id = $2`, [worker.fio, req.user.id])
        await pool.query(`
            INSERT INTO worker_tasks (worker_id, contract_id, tasktime, summa, taskdate, clientname, ispay, onetimemoney, address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                id.rows[0].id, 
                task.rows[0].contract_id, 
                task.rows[0].tasktime, 
                task.rows[0].allmoney / task.rows[0].workernumber,
                task.rows[0].taskdate,
                task.rows[0].clientname,
                ispay,
                (task.rows[0].allmoney / task.rows[0].workernumber) / task.rows[0].tasktime,
                contract.rows[0].address
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
    const tasks = await pool.query(`SELECT * FROM worker_tasks WHERE worker_id = $1`, [req.params.id])
    let result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate)
        return task
    })
    const allmoney = getWorkerAllMoney(tasks.rows)
    console.log(tasks.rows)
    return res.status(200).json({
        success: true,
        data: result,
        allmoney
    })

})