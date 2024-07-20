
const pool = require('../config/db')
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');

const {
    returnDate,
    returnStringDate
} = require('../utils/date.function');


// create special 
exports.createSpecial = asyncHandler(async (req, res, next) => {
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
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 18.12.2024", 400))
    }

    const iib_tasks = await pool.query(`SELECT * FROM iib_tasks WHERE ispay = $1 AND pay = $2 AND taskdate BETWEEN $3 AND $4 
        `,[true, false, date1, date2])
    if(iib_tasks.rows.length < 1){
        return next(new ErrorResponse('ushbu muddat ichida Toshkent Shahar IIBB, 98162, 98157 ommaviy tadbirda ishtirok etmadi yoki ishtirok etgan tadbirlar hali pul otkazmadi', 400))
    }

    const command = await pool.query(`INSERT INTO commands (date1, date2, commanddate, commandnumber, status) VALUES($1, $2, $3, $4, $5) RETURNING *
        `, [date1, date2, commandDate, commandNumber, true])
    
    await pool.query(`
        UPDATE iib_tasks  
        SET command_id = $1, pay = $2
        WHERE ispay = $3 AND pay = $4 AND taskdate BETWEEN $5 AND $6
    `, [command.rows[0].id, true, true, false, date1, date2]);

    return res.status(200).json({
        success: true,
        data: command.rows
    })
})

// get all special  
exports.getAllSpecial = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    const limit = parseInt(req.query.limit) || 10 
    const page = parseInt(req.query.page) || 1

    const commands =  await pool.query(`SELECT id, commandnumber, commanddate FROM commands WHERE status = $1 OFFSET $2 LIMIT $3 `, [true, (page - 1) * limit, limit])
    let result  = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate)
        return command  
    })

    const total = await pool.query(`SELECT COUNT(id) AS total FROM commands WHERE status = $1`, [true])
    
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

// get iib_batalyon and contracts 
exports.getIibBatalyonAndContracts = asyncHandler(async (req, res, next) => {
    command = await pool.query(`SELECT date1, date2  FROM commands WHERE id = $1`, [req.params.id])
    let resultCommand  = command.rows.map(command => {
        command.date1 = returnStringDate(command.date1)
        command.date2 = returnStringDate(command.date2)
        return command  
    })
    
    let resultArray = []
    const batalyons = await pool.query(`
        SELECT username 
        FROM users 
        WHERE adminstatus = $1 
        AND (username = $2 OR username = $3 OR username = $4)
    `, [false, "Toshkent Shahar IIBB", "98162", "98157"]);

    for(let batalyon of batalyons.rows){
        let payTasks = await pool.query(`SELECT contractnumber, taskdate,  clientname, address, workernumber, allmoney 
            FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2`, [batalyon.username, true])
        resultPayTasks = payTasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate)
            return task
        }) 

        let tasks = await pool.query(`SELECT contractnumber, taskdate,  clientname, address, workernumber, allmoney 
            FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2`, [batalyon.username, false])
        resultTasks = tasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate)
            return task
        })

        const summa = await pool.query(`SELECT SUM(allmoney) 
            FROM iib_tasks 
            WHERE battalionname = $1 AND pay = $2`, [batalyon.username, true])

        const notPaySumma = await pool.query(`SELECT SUM(allmoney) 
            FROM iib_tasks 
            WHERE battalionname = $1 AND pay = $2`, [batalyon.username, false])
        
        if(tasks.rows.length >= 1 || payTasks.rows.length >= 1){
            resultArray.push({
                batalyonName : batalyon.username,
                payContracts : resultPayTasks,
                summa: summa.rows[0].sum,
                notPayContracts: resultTasks,
                notPaySumma: notPaySumma.rows[0].sum ? notPaySumma.rows[0].sum : 0
            })
        }
    }
    return res.status(200).json({
        success: true,
        data: resultArray,
        commandDate: resultCommand
    })
})

// filter special by date 
exports.getAllSpecialFilterByDate = asyncHandler(async (req, res, next) => {
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
        `, [true, date1, date2])
    let result  = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate)
        return command  
    })

    return res.status(200).json({
        success: true,
        data: result
    })

})

// delete 
exports.deleteCommands = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    await pool.query(`UPDATE iib_tasks SET pay = $1, command_id = $2 WHERE command_id = $3`, [false, null, req.params.id])
    const command = await pool.query(`DELETE FROM commands WHERE id = $1 RETURNING *`, [req.params.id])
    res.status(200).json({
        success: true,
        data: command.rows
    })
})

// get special batalyon 
exports.getSpecialBatalyon = asyncHandler(async (req, res, next) => {
    const batalyons = await pool.query(`SELECT id, username FROM users WHERE username = $1 OR username = $2 OR username = $3`, [ "98162", "98157", "Toshkent Shahar IIBB" ])
    res.status(200).json({
        success: true,
        data: batalyons.rows
    })
})

// get special data
exports.getSpecialData = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403));
    }

    const batalyon = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    if (batalyon.rows.length === 0) {
        return next(new ErrorResponse("Batalyon topilmadi", 404));
    }

    let payTasks = await pool.query(`SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2`, 
        [batalyon.rows[0].username, true]
    );

    let resultPayTasks = payTasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    let tasks = await pool.query(`SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2`, 
        [batalyon.rows[0].username, false]
    );

    let resultTasks = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    const summa = await pool.query(`SELECT SUM(allmoney) 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2`, 
        [batalyon.rows[0].username, true]
    );

    const notPaySumma = await pool.query(`SELECT SUM(allmoney) 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2`, 
        [batalyon.rows[0].username, false]
    );

    return res.status(200).json({
        success: true,
        data: {
            batalyonName: batalyon.rows[0].username,
            payContracts: resultPayTasks,
            summa: summa.rows[0].sum ? summa.rows[0].sum : 0,
            notPayContracts: resultTasks,
            notPaySumma: notPaySumma.rows[0].sum ? notPaySumma.rows[0].sum : 0
        }
    });
});

// get special filter date 
exports.getSpecialFiterDate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403));
    }

    let { date1, date2 } = req.body;
    date1 = returnDate(date1);
    date2 = returnDate(date2);
    if (!date1 || !date2) {
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400));
    }

    const batalyon = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    if (batalyon.rows.length === 0) {
        return next(new ErrorResponse("Batalyon topilmadi", 404));
    }

    let payTasks = await pool.query(`SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2 AND taskdate BETWEEN $3 AND $4`, 
        [batalyon.rows[0].username, true, date1, date2]
    );
    let resultPayTasks = payTasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    let tasks = await pool.query(`SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2 AND taskdate BETWEEN $3 AND $4`, 
        [batalyon.rows[0].username, false, date1, date2]
    );
    let resultTasks = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    const summa = await pool.query(`SELECT SUM(allmoney) 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2 AND taskdate BETWEEN $3 AND $4`, 
        [batalyon.rows[0].username, true, date1, date2]
    );

    const notPaySumma = await pool.query(`SELECT SUM(allmoney) 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2 AND taskdate BETWEEN $3 AND $4`, 
        [batalyon.rows[0].username, false, date1, date2]
    );

    return res.status(200).json({
        success: true,
        data: {
            batalyonName: batalyon.rows[0].username,
            payContracts: resultPayTasks,
            summa: summa.rows[0].sum ? summa.rows[0].sum : 0,
            notPayContracts: resultTasks,
            notPaySumma: notPaySumma.rows[0].sum ? notPaySumma.rows[0].sum : 0
        }
    });
});
