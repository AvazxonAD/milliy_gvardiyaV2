const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require("../config/db");

const {
    returnDate,
    returnStringDate,
    returnLocalDate
} = require('../utils/date.function')

const { blockTask } = require('../utils/worker.tasks.function')

// get all tasks 
exports.getAllTasks = asyncHandler(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    /*let taskTest = await pool.query(`SELECT id, taskdate, inprogress FROM tasks WHERE user_id = $1 `, [req.user.id])
        let tests = blockTask(taskTest.rows)
        for (let test of tests) {
            await pool.query(`UPDATE tasks 
                SET notdone = $1, done = $2, inprogress = $3
                WHERE id = $4
            `, [true, false, false, test.id])
    }*/

    const tasks = await pool.query(`
        SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, timelimit, inProgress, done, notdone, address 
        FROM tasks 
        WHERE user_id = $1
        ORDER BY contractnumber 
        OFFSET $2 
        LIMIT $3
    `, [req.user.id, offset, limit]);

    // Format task dates
    const result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    const total = await pool.query(`
        SELECT COUNT(id) AS total 
        FROM tasks 
        WHERE user_id = $1
    `, [req.user.id]);

    return res.status(200).json({
        success: true,
        pageCount: Math.ceil(total.rows[0].total / limit),
        count: total.rows[0].total,
        currentPage: page,
        nextPage: page * limit < total.rows[0].total ? page + 1 : null,
        backPage: page > 1 ? page - 1 : null,
        data: result
    });
});

// filter by status 
exports.filterByStatus = asyncHandler(async (req, res, next) => {
    const statusQuery = req.query.inProgress ? 'inprogress = TRUE' :
                        req.query.done ? 'done = TRUE' :
                        req.query.notDone ? 'notdone = TRUE' : '1=1'; // Default to 1=1 if no query

    /*let taskTest = await pool.query(`SELECT id, taskdate, inprogress FROM tasks WHERE user_id = $1 `, [req.user.id])
        let tests = blockTask(taskTest.rows)
        for (let test of tests) {
            await pool.query(`UPDATE tasks 
                SET notdone = $1, done = $2, inprogress = $3
                WHERE id = $4
                `, [true, false, false, test.id])
    }*/

    const tasks = await pool.query(`
        SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, timelimit, inProgress, done, notdone, address 
        FROM tasks 
        WHERE user_id = $1 AND ${statusQuery} 
        ORDER BY contractnumber 
    `, [req.user.id]);

    const result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    return res.status(200).json({
        success: true,
        data: result
    });
});

// filter by date 
exports.filterByDate = asyncHandler(async (req, res, next) => {
    let { date1, date2 } = req.body;
    date1 = returnDate(date1);
    date2 = returnDate(date2);

    if (!date1 || !date2) {
        return next(new ErrorResponse("Sana formati noto'g'ri kiritilgan. To'g'ri format: kun.oy.yil. Masalan: 12.12.2024", 400));
    }
    /*let taskTest = await pool.query(`SELECT id, taskdate, inprogress FROM tasks WHERE user_id = $1 `, [req.user.id])
        let tests = blockTask(taskTest.rows)
        for (let test of tests) {
            await pool.query(`UPDATE tasks 
                SET notdone = $1, done = $2, inprogress = $3
                WHERE id = $4
                `, [true, false, false, test.id])
    }*/
   
    const tasks = await pool.query(`
        SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, timelimit, inProgress, done, notdone, address
        FROM tasks
        WHERE user_id = $1 AND taskdate BETWEEN $2 AND $3
        ORDER BY contractnumber
    `, [req.user.id, date1, date2]);

    const result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    return res.status(200).json({
        success: true,
        data: result
    });
});

// get all task workers 
exports.taskWorkers = asyncHandler(async (req, res, next) => {
    const workers = await pool.query(`
        SELECT worker_name, tasktime, taskdate, id
        FROM worker_tasks 
        WHERE user_id = $1 AND task_id = $2
        ORDER BY createdat
    `, [req.user.id, req.params.id]);
    
    const result = workers.rows.map(item => {
        item.taskdate = returnStringDate(item.taskdate)
        return item
    })
    return res.status(200).json({
        success: true,
        data: result
    });
});

// delete worker 
exports.deleteWorker = asyncHandler(async (req, res, next) => {
    const worker_task = await pool.query(`DELETE FROM worker_tasks WHERE id = $1 AND pay = $2 RETURNING id `, [req.params.id, false])
    
    if(!worker_task.rows[0]){
        return next(new ErrorResponse(`${worker_name} uchun xizmat puli tolab bolingan endi ushbu amalni bajara olmaysiz`, 400))
    }

    if(worker_task.rows[0]){
        const task = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [req.params.id])
        if(task.rows[0].done){
            await pool.query(`UPDATE tasks SET done = $1, notdone = $2, inprogress = $3 WHERE id = $4`, [false, false, true, req.params.id])
 
        }

        /*let taskTest = await pool.query(`SELECT id, taskdate, inprogress FROM tasks WHERE user_id = $1 `, [req.user.id])
        let tests = blockTask(taskTest.rows)
        for (let test of tests) {
            await pool.query(`UPDATE tasks 
                SET notdone = $1, done = $2, inprogress = $3
                WHERE id = $4
                `, [true, false, false, test.id])
        }*/
        
        return res.status(200).json({
            success: true,
            data: "DELETE TRUE"
        })
    }
})

// task info modal 
exports.getTaskInfoModal = asyncHandler(async (req, res, next) => {
    const  rows = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [req.params.id])
    const task = rows.rows.map(item => {
        item.taskdate = returnLocalDate(item.taskdate)
        return item
    })
    
    if(!task){
        return next(new ErrorResponse('server xatolik', 400))
    }


    return res.status(200).json({
        success: true,
        task
    })
})

// get element by id 
exports.getById = asyncHandler(async (req, res, next) => {
    const rows = await pool.query(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id])
    if(!rows.rows[0]){
        return next(new ErrorResponse('server xatolik topshiriq topilmadi', 400))
    }
    
    const task = rows.rows.map(item => {
        item.taskdate = returnStringDate(item.taskdate)
        return item
    })

    return res.status(200).json({
        success: true,
        data: task[0]
    })
})