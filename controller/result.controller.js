const pool = require('../config/db')
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');

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

// get all commands 
exports.getAllCommand = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const limit = parseInt(req.query.limit) || 10 
    const page = parseInt(req.query.page) || 1

    const commands =  await pool.query(`SELECT commandnumber, commanddate FROM commands OFFSET $1 LIMIT $2 `, [(page - 1) * limit, limit ])
    let result  = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate)
        return command  
    })

    const total = await pool.query(`SELECT COUNT(id) AS total FROM commands `)
    
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