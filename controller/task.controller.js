const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const pool = require("../config/db");

const {
    returnDate,
    returnStringDate,
    returnLocalDate
} = require('../utils/date.function')

//const { blockTask } = require('../utils/worker.tasks.function')

// get all tasks 
exports.getAllTasks = asyncHandler(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    // let taskTest = await pool.query(`SELECT id, taskdate, inprogress FROM tasks WHERE battalionname = $1 `, [req.user.username])
    // let tests = blockTask(taskTest.rows)
    // for (let test of tests) {
    //     await pool.query(`UPDATE tasks 
    //         SET notdone = $1, done = $2, inprogress = $3
    //         WHERE id = $4
    //         `, [true, false, false, test.id])
    // }

    const tasks = await pool.query(`
        SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, timelimit, inProgress, done, notdone, address 
        FROM tasks 
        WHERE battalionname = $1 
        ORDER BY contractnumber
        OFFSET $2 
        LIMIT $3
    `, [req.user.username, offset, limit]);

    // Format task dates
    const result = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    const total = await pool.query(`
        SELECT COUNT(id) AS total 
        FROM tasks 
        WHERE battalionname = $1
    `, [req.user.username]);

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

    const tasks = await pool.query(`
        SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, timelimit, inProgress, done, notdone, address 
        FROM tasks 
        WHERE battalionname = $1 AND ${statusQuery} 
        ORDER BY contractnumber 
    `, [req.user.username]);

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

    const tasks = await pool.query(`
        SELECT id, contractnumber, clientname, workernumber, taskdate, tasktime, timelimit, inProgress, done, notdone, address
        FROM tasks
        WHERE battalionname = $1 AND taskdate BETWEEN $2 AND $3
        ORDER BY contractnumber
    `, [req.user.username, date1, date2]);

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
        SELECT worker_name 
        FROM worker_tasks 
        WHERE user_id = $1 AND task_id = $2
    `, [req.user.id, req.params.id]);

    return res.status(200).json({
        success: true,
        data: workers.rows
    });
});

// task info modal 
exports.getTaskInfoModal = asyncHandler(async (req, res, next) => {
    const  rows = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [req.params.id])
    const task = rows.rows[0]
    
    if(!task){
        return next(new ErrorResponse('server xatolik', 400))
    }

    const data  = {
        battalion: `Ушбу топшириқ : ${task.battalionname} батальон учун `,
        contractnumber: `Шартнома рақами : ${task.contractnumber}`,
        clientname: `Буюртмачи номи : ${task.clientname}`,
        taskdate: `Тадбир отадиган охирги кун : ${returnLocalDate(task.taskdate)} сиз ушбу кун отгандан сўнг 2 кун ичида ходимларни барчасини киритиб болган болишинггиз зарур агар тадбир бир неча кун давом этса ходимларни бир неча марта киритишинггиз мумкин лекин сиз учун ажратилган соатга етганда топшириқ бажарилган статусга озгаради `,
        workernumber: `Ходимлар сони : ${task.workernumber} йодда тутинг бу ходимлар сизнинг батальондан ажратилган ходим сонига тенг лекин тадбир бир неча кун давом этса бу ходим сони кўпайиши мумкин ва бир кунлик ходим сонига тенг бўлади`,
        timemoney: `Бир соат учун ${task.timemoney} сўм ушбу сумма буюртмачи чегирма қилиб берилса ёки БХМ кўтарилса ошиши ёки камайиши мумкин`,
        tasktime: `Топшириқ вақти : ${task.tasktime} соат албатта бу вақт битта ходим учун, ушбу топшириқ бўйича  батальон учун умумий топшириқ вақти : ${task.tasktime * task.workernumber} соат`,
        timeLimit: task.timelimit ? `TIME LIMIT : ${task.timelimit} ушбу соат тадбир отадиган вақт ёки тадбир бир неча кун болса ҳар кунлик вақт лимити ` : `Админ билан боғланинг ушбу тадбир ўтадиган  вақти но'малум `,
        inProgress: task.inprogress,
        done: task.done,
        notDone: task.notdone,

    }

    return res.status(200).json({
        success: true,
        data
    })
})