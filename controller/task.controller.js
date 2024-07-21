const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require("../config/db");

const {
    returnDate,
    returnStringDate
} = require('../utils/date.function')

const { blockTask } = require('../utils/worker.tasks.function')

// get all tasks 
exports.getAllTasks = asyncHandler(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 10 
    const page = parseInt(req.query.page) || 1
    let taskTest = await pool.query(`SELECT id, taskdate, inprogress FROM tasks WHERE battalionname = $1 `, [req.user.username])
    let tests = blockTask(taskTest.rows)
    for (let test of tests) {
        await pool.query(`UPDATE tasks 
            SET notdone = $1, done = $2, inprogress = $3
            WHERE id = $4
            `, [true, false, false, test.id])
    }

    let tasks = await pool.query(`SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone, address 
        FROM tasks WHERE battalionname = $1 ORDER BY  taskdate DESC
    `, [req.user.username])
    let result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate)
        return task
    })
    const total = await pool.query(`SELECT COUNT(id) AS total FROM tasks WHERE battalionname = $1`, [req.user.username])

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

// filter by status 
exports.filterByStatus = asyncHandler(async (req, res, next) => {
    let tasks = null
    if (req.query.inProgress) {
        tasks = await pool.query(`SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone, address FROM tasks WHERE battalionname = $1 AND inprogress = $2 ORDER BY createdat DESC
        `, [req.user.username, true])
    }

    else if (req.query.done) {
        tasks = await pool.query(`SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone, address FROM tasks WHERE battalionname = $1 AND done = $2 ORDER BY createdat DESC
        `, [req.user.username, true])
    }

    else if (req.query.notDone) {
        tasks = await pool.query(`SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone, address
            FROM tasks 
            WHERE battalionname = $1 AND notdone = $2`, [req.user.username, true])
    }

    let result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate)
        return task
    })
    return res.status(200).json({
        success: true,
        data: result
    })

})

// filter by date 
exports.filterByDate = asyncHandler(async (req, res, next) => {

    let { date1, date2 } = req.body
    date1 = returnDate(date1)
    date2 = returnDate(date2)
    if (!date1 || !date2) {
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    let tasks = await pool.query(`SELECT  id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone, address
        FROM tasks 
        WHERE  battalionanme = $1 AND taskdate BETWEEN $2 AND $3
    `, [req.user.username, date1, date2])

    let result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate)
        return task
    })
    return res.status(200).json({
        success: true,
        data: result
    })
})

// get all task workers 
exports.taskWorkers = asyncHandler(async (req, res, next) => {
    const workers = await pool.query(`SELECT worker_name FROM worker_tasks WHERE user_id = $1 AND task_id = $2
        `, [ req.user.id, req.params.id])
    return res.status(200).json({
        success: true,
        data: workers.rows
    })
})