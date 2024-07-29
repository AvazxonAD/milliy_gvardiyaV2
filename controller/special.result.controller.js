
const pool = require('../config/db')
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');
const xlsx = require('xlsx')

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

    const iib_tasks = await pool.query(`SELECT * FROM iib_tasks WHERE ispay = $1 AND pay = $2 AND taskdate < $3
        `, [true, false, date2])
    if (iib_tasks.rows.length === 0) {
        return next(new ErrorResponse('ushbu muddat ichida Toshkent Shahar IIBB, 98162, 98157 ommaviy tadbirda ishtirok etmadi yoki ishtirok etgan tadbirlar hali pul otkazmadi', 400))
    }

    const command = await pool.query(`INSERT INTO commands (date1, date2, commanddate, commandnumber, status) VALUES($1, $2, $3, $4, $5) RETURNING *
        `, [date1, date2, commandDate, commandNumber, true])

    await pool.query(`
        UPDATE iib_tasks  
        SET command_id = $1, pay = $2
        WHERE ispay = $3 AND pay = $4 AND taskdate < $5
    `, [command.rows[0].id, true, true, false, date2]);

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

    const commands = await pool.query(`SELECT id, commandnumber, commanddate FROM commands WHERE status = $1 OFFSET $2 LIMIT $3 `, [true, (page - 1) * limit, limit])
    let result = commands.rows.map(command => {
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
    const commandQuery = `
            SELECT id, date1, date2 
            FROM commands 
            WHERE id = $1
        `;
    const command = await pool.query(commandQuery, [req.params.id]);

    if (!command.rows.length) {
        return res.status(404).json({
            success: false,
            message: "Command not found"
        });
    }


    let resultArray = [];

    const batalyonsQuery = `
            SELECT username 
            FROM users 
            WHERE status = $1
        `;
    const batalyons = await pool.query(batalyonsQuery, [true]);

    for (let batalyon of batalyons.rows) {
        const payTasksQuery = `
                SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney, tasktime
                FROM iib_tasks 
                WHERE battalionname = $1 
                AND command_id = $2
            `;
        const payTasks = await pool.query(payTasksQuery, [batalyon.username, command.rows[0].id]);

        const resultPayTasks = payTasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate);
            return task;
        });

        const tasksQuery = `
                SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney, tasktime
                FROM iib_tasks 
                WHERE battalionname = $1 
                AND pay = $2 
                AND taskdate < $3 
                AND command_id IS NULL
            `;
        const tasks = await pool.query(tasksQuery, [ batalyon.username, false, command.rows[0].date2 ]);

        const resultTasks = tasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate);
            return task;
        });

        const summaQuery = `
                SELECT SUM(allmoney) AS sum 
                FROM iib_tasks 
                WHERE battalionname = $1 
                AND command_id = $2
            `;
        const summa = await pool.query(summaQuery, [
            batalyon.username, command.rows[0].id
        ]);

        const notPaySummaQuery = `
                SELECT SUM(allmoney) AS sum 
                FROM iib_tasks 
                WHERE battalionname = $1 
                AND pay = $2 
                AND taskdate < $3 
                AND command_id IS NULL
            `;
        const notPaySumma = await pool.query(notPaySummaQuery, [
            batalyon.username, false, command.rows[0].date2
        ]);

        if (tasks.rows.length !== 0 || payTasks.rows.length !== 0) {
            resultArray.push({
                batalyonName: batalyon.username,
                payContracts: resultPayTasks,
                summa: summa.rows[0].sum || 0,
                notPayContracts: resultTasks,
                notPaySumma: notPaySumma.rows[0].sum || 0
            });
        }
    }

    let resultCommand = command.rows.map(cmd => {
        cmd.date1 = returnStringDate(cmd.date1);
        cmd.date2 = returnStringDate(cmd.date2);
        return cmd;
    });

    return res.status(200).json({
        success: true,
        data: resultArray,
        commandDate: resultCommand
    });
});

// filter special by date 
exports.getAllSpecialFilterByDate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let { date1, date2 } = req.body
    date1 = returnDate(date1)
    date2 = returnDate(date2)
    if (!date1 || !date2) {
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    const commands = await pool.query(`SELECT id, commandnumber, commanddate FROM commands WHERE status = $1 AND commanddate BETWEEN $2 AND $3
        `, [true, date1, date2])
    let result = commands.rows.map(command => {
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

// qoshimcha page 
// get special batalyon 
exports.getSpecialBatalyon = asyncHandler(async (req, res, next) => {
    const batalyons = await pool.query(`SELECT id, username FROM users WHERE status = $1`, [true])
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

    let payTasks = await pool.query(`SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney, tasktime
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2`,
        [batalyon.rows[0].username, true]
    );

    let resultPayTasks = payTasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    let tasks = await pool.query(`SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney, tasktime
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


exports.getAllSpecialToExcel = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    const { data } = req.body;

    if (!data) {
        return next(new ErrorResponse('Server xatolik', 500));
    }

    // Sheetlar uchun ma'lumotlarni tayyorlash
    const payContractsSheet = xlsx.utils.json_to_sheet(data.payContracts, {header: ["contractnumber", "taskdate", "clientname", "address", "workernumber", "allmoney", "tasktime"]});
    const notPayContractsSheet = xlsx.utils.json_to_sheet(data.notPayContracts, {header: ["contractnumber", "taskdate", "clientname", "address", "workernumber", "allmoney", "tasktime"]});
    const batalyonNameSheet = xlsx.utils.json_to_sheet([{ "Batalyon Nomi": data.batalyonName }]);
    const summaSheet = xlsx.utils.json_to_sheet([{ "Summa": data.summa }]);
    const notPaySummaSheet = xlsx.utils.json_to_sheet([{ "Not Pay Summa": data.notPaySumma }]);

    // Ustun kengliklarini belgilash
    payContractsSheet['!cols'] = [
        { width: 15 }, // contractnumber
        { width: 20 }, // taskdate
        { width: 50 }, // clientname
        { width: 30 }, // address
        { width: 15 }, // workernumber
        { width: 20 }, // allmoney
        { width: 15 }  // tasktime
    ];

    notPayContractsSheet['!cols'] = [
        { width: 15 }, // contractnumber
        { width: 20 }, // taskdate
        { width: 50 }, // clientname
        { width: 30 }, // address
        { width: 15 }, // workernumber
        { width: 20 }, // allmoney
        { width: 15 }  // tasktime
    ];

    batalyonNameSheet['!cols'] = [{ width: 30 }];
    summaSheet['!cols'] = [{ width: 20 }];
    notPaySummaSheet['!cols'] = [{ width: 20 }];

    // Yangi workbook yaratish va sheetlarni qo'shish
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, batalyonNameSheet, 'Batalyon Nomi');
    xlsx.utils.book_append_sheet(workbook, payContractsSheet, 'Pay Contracts');
    xlsx.utils.book_append_sheet(workbook, notPayContractsSheet, 'Not Pay Contracts');
    xlsx.utils.book_append_sheet(workbook, summaSheet, 'Summa');
    xlsx.utils.book_append_sheet(workbook, notPaySummaSheet, 'Not Pay Summa');

    // Workbookni bufferga yozish
    const buffer = xlsx.write(workbook, { type: 'buffer' });
    const filename = `${Date.now()}_data.xlsx`;

    // Excel faylini yuborish uchun HTTP headers sozlash
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
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
        WHERE battalionname = $1 AND pay = $2 AND  taskdate BETWEEN $3 AND $4`,
        [batalyon.rows[0].username, false, date1, date2]
    );
    let resultTasks = tasks.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    const summa = await pool.query(`SELECT SUM(allmoney) 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2 AND  taskdate BETWEEN $3 AND $4`,
        [batalyon.rows[0].username, true, date1, date2]
    );

    const notPaySumma = await pool.query(`SELECT SUM(allmoney) 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2 AND  taskdate BETWEEN $3 AND $4`,
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
        },
        dates: { date1: returnStringDate(date1), date2: returnStringDate(date2) }
    });
});

// filter status 
exports.getFilterStatus = asyncHandler(async (req, res, next) => {
    let result = [];
    let summa = null;

    const batalyonQuery = `SELECT * FROM users WHERE id = $1`;
    const batalyon = await pool.query(batalyonQuery, [req.params.id]);

    if (!batalyon.rows.length) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    const username = batalyon.rows[0].username;

    if (req.query.pay) {
        const payTasksQuery = `
                SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney 
                FROM iib_tasks 
                WHERE battalionname = $1 AND pay = $2
            `;
        const payTasks = await pool.query(payTasksQuery, [username, true]);

        result = payTasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate);
            return task;
        });

        const summaQuery = `
                SELECT SUM(allmoney) AS sum 
                FROM iib_tasks 
                WHERE battalionname = $1 AND pay = $2
            `;
        summa = await pool.query(summaQuery, [username, true]);
    }

    if (req.query.notPay) {
        const tasksQuery = `
                SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney 
                FROM iib_tasks 
                WHERE battalionname = $1 AND pay = $2
            `;
        const tasks = await pool.query(tasksQuery, [username, false]);

        result = tasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate);
            return task;
        });

        const summaQuery = `
                SELECT SUM(allmoney) AS sum 
                FROM iib_tasks 
                WHERE battalionname = $1 AND pay = $2
            `;
        summa = await pool.query(summaQuery, [username, false]);
    }

    return res.status(200).json({
        success: true,
        data: result,
        summa: summa ? summa.rows[0].sum : 0
    });
});

// get filter by date and satus 
exports.getSpecialFilterByDateAndStatus = asyncHandler(async (req, res, next) => {
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

    let result = null
    let summa = null

    if (req.query.pay) {
        let payTasks = await pool.query(`SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney 
            FROM iib_tasks 
            WHERE battalionname = $1 AND pay = $2 AND taskdate >= $3 AND taskdate <= $4`,
            [batalyon.rows[0].username, true, date1, date2]
        );
        result = payTasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate);
            return task;
        });

        summa = await pool.query(`SELECT SUM(allmoney) 
        FROM iib_tasks 
        WHERE battalionname = $1 AND pay = $2 AND taskdate >= $3 AND taskdate <= $4`,
            [batalyon.rows[0].username, true, date1, date2]
        );
    }

    if (req.query.notPay) {
        let tasks = await pool.query(`SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney 
            FROM iib_tasks 
            WHERE battalionname = $1 AND pay = $2 AND taskdate >= $3 AND taskdate <= $4`,
            [batalyon.rows[0].username, false, date1, date2]
        );
        result = tasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate);
            return task;
        });

        summa = await pool.query(`SELECT SUM(allmoney) 
            FROM iib_tasks 
            WHERE battalionname = $1 AND pay = $2 AND taskdate >= $3 AND taskdate <= $4`,
            [batalyon.rows[0].username, false, date1, date2]
        );
    }

    return res.status(200).json({
        success: true,
        data: result,
        summa: summa ? summa.rows[0].sum : 0
    });

})