const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require("../config/db");

const {
    returnDate,
    returnStringDate
} = require('../utils/date.function')

const {blockTask} = require('../utils/worker.tasks.function')

// get all tasks 
exports.getAllTasks = asyncHandler(async (req, res, next) => {
    let taskTest = await pool.query(`SELECT id, taskdate, inprogress FROM tasks WHERE user_id = $1`, [req.user.id])
    let tests = blockTask(taskTest.rows) 
    for(let test of tests){
        await pool.query(`UPDATE tasks 
            SET notdone = $1, done = $2, inprogress = $3
            WHERE id = $4
            `,[true, false, false, test.id] )
    }
    
    let  tasks = await pool.query(`
        SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone
        FROM tasks 
        WHERE user_id = $1
        `, [req.user.id])
    let result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate)
        return task
    })
    return res.status(200).json({
        success: true,
        data: result
    })
})

// filter by status 
exports.filterByStatus = asyncHandler(async (req, res, next) => {
    let tasks = null
    if(req.query.inProgress){
        tasks = await pool.query(`SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone 
            FROM tasks 
            WHERE user_id = $1 AND inprogress = $2`, [req.user.id, true])
    }

    else if(req.query.done){
        tasks = await pool.query(`SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone 
            FROM tasks 
            WHERE user_id = $1 AND done = $2`, [req.user.id, true])
    }

    else if(req.query.notDone){
        tasks = await pool.query(`SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, inProgress, done, notdone 
            FROM tasks 
            WHERE user_id = $1 AND notdone = $2`, [req.user.id, true])
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