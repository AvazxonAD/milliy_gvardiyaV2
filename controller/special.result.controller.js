
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
        return next(new ErrorResponse('ushbu muddat ichida harkorlikdagi birgadalar ommaviy tadbirda ishtirok etmadi yoki ishtirok etgan tadbirlar hali pul otkazmadi', 400))
    }

    const command = await pool.query(`INSERT INTO commands (date1, date2, commanddate, commandnumber, status, user_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING *
        `, [date1, date2, commandDate, commandNumber, true, req.user.id])

    const iib_battalions = await pool.query(`SELECT id FROM users WHERE user_id = $1`, [req.user.id])
    for (let battalion of iib_battalions.rows) {
        await pool.query(`
            UPDATE iib_tasks  
            SET command_id = $1, pay = $2
            WHERE ispay = $3 AND pay = $4 AND taskdate < $5 AND user_id = $6
        `, [command.rows[0].id, true, true, false, date2, battalion.id]);
    }

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

    const commands = await pool.query(`SELECT id, commandnumber, commanddate, date1, date2 FROM commands WHERE status = $1 AND user_id = $2 OFFSET $3 LIMIT $4 `, [true, req.user.id, (page - 1) * limit, limit])
    const result = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate);
        command.date1 = returnStringDate(command.date1)
        command.date2 = returnStringDate(command.date2)
        return command;
    });

    const total = await pool.query(`SELECT COUNT(id) AS total FROM commands WHERE status = $1 AND user_id = $2`, [true, req.user.id])

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
        return next(new ErrorResponse('server xatolik', 404));
    }

    let resultArray = [];

    const batalyonsQuery = `
        SELECT id, username
        FROM users 
        WHERE status = $1 AND user_id = $2
    `;
    const batalyons = await pool.query(batalyonsQuery, [true, req.user.id]);

    for (let batalyon of batalyons.rows) {
        const payTasksQuery = `
            SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney
            FROM iib_tasks 
            WHERE user_id = $1 
            AND command_id = $2
        `;
        const payTasks = await pool.query(payTasksQuery, [batalyon.id, command.rows[0].id]);

        const resultPayTasks = await Promise.all(payTasks.rows.map(async task => {
            const timelimit = await pool.query(`
                SELECT timelimit 
                FROM contracts 
                WHERE contractnumber = $1 AND user_id = $2
            `, [task.contractnumber, req.user.id]);
            task.taskdate = timelimit.rows[0].timelimit;
            return task;
        }));

        const tasksQuery = `
            SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney
            FROM iib_tasks 
            WHERE user_id = $1 
            AND pay = $2 
            AND taskdate < $3 
            AND command_id IS NULL
        `;
        const tasks = await pool.query(tasksQuery, [batalyon.id, false, command.rows[0].date2]);

        const resultTasks = await Promise.all(tasks.rows.map(async task => {
            const timelimit = await pool.query(`
                SELECT timelimit 
                FROM contracts 
                WHERE contractnumber = $1 AND user_id = $2
            `, [task.contractnumber, req.user.id]);
            task.taskdate = timelimit.rows[0].timelimit;
            return task;
        }));

        const summaQuery = `
            SELECT SUM(allmoney) AS sum 
            FROM iib_tasks 
            WHERE user_id = $1 
            AND command_id = $2
        `;
        const summa = await pool.query(summaQuery, [batalyon.id, command.rows[0].id]);

        const notPaySummaQuery = `
            SELECT SUM(allmoney) AS sum 
            FROM iib_tasks 
            WHERE user_id = $1 
            AND pay = $2 
            AND taskdate < $3 
            AND command_id IS NULL
        `;
        const notPaySumma = await pool.query(notPaySummaQuery, [batalyon.id, false, command.rows[0].date2]);

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

// get all special data to excel    
exports.getAllSpecialToExcel = asyncHandler(async (req, res, next) => {
    const commandQuery = `
        SELECT id, date1, date2 
        FROM commands 
        WHERE id = $1
    `;
    const command = await pool.query(commandQuery, [req.params.id]);

    if (!command.rows.length) {
        return next(new ErrorResponse('server xatolik', 404));
    }

    let resultArray = [];

    const batalyonsQuery = `
        SELECT id, username
        FROM users 
        WHERE status = $1 AND user_id = $2
    `;
    const batalyons = await pool.query(batalyonsQuery, [true, req.user.id]);

    for (let batalyon of batalyons.rows) {
        const payTasksQuery = `
            SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney
            FROM iib_tasks 
            WHERE user_id = $1 
            AND command_id = $2
        `;
        const payTasks = await pool.query(payTasksQuery, [batalyon.id, command.rows[0].id]);

        const resultPayTasks = await Promise.all(payTasks.rows.map(async task => {
            const timelimit = await pool.query(`
                SELECT timelimit 
                FROM contracts 
                WHERE contractnumber = $1 AND user_id = $2
            `, [task.contractnumber, req.user.id]);
            task.taskdate = timelimit.rows[0].timelimit;
            return task;
        }));

        const tasksQuery = `
            SELECT contractnumber, taskdate, clientname, address, workernumber, allmoney
            FROM iib_tasks 
            WHERE user_id = $1 
            AND pay = $2 
            AND taskdate < $3 
            AND command_id IS NULL
        `;
        const tasks = await pool.query(tasksQuery, [batalyon.id, false, command.rows[0].date2]);

        const resultTasks = await Promise.all(tasks.rows.map(async task => {
            const timelimit = await pool.query(`
                SELECT timelimit 
                FROM contracts 
                WHERE contractnumber = $1 AND user_id = $2
            `, [task.contractnumber, req.user.id]);
            task.taskdate = timelimit.rows[0].timelimit;
            return task;
        }));

        const summaQuery = `
            SELECT SUM(allmoney) AS sum 
            FROM iib_tasks 
            WHERE user_id = $1 
            AND command_id = $2
        `;
        const summa = await pool.query(summaQuery, [batalyon.id, command.rows[0].id]);

        const notPaySummaQuery = `
            SELECT SUM(allmoney) AS sum 
            FROM iib_tasks 
            WHERE user_id = $1 
            AND pay = $2 
            AND taskdate < $3 
            AND command_id IS NULL
        `;
        const notPaySumma = await pool.query(notPaySummaQuery, [batalyon.id, false, command.rows[0].date2]);

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

    const worksheetData = resultArray.flatMap(batalyon => {
        const payContracts = batalyon.payContracts.map(contract => ({
            'Batalyon': batalyon.batalyonName,
            'Contract Type': 'Tolangan',
            'Contract Number': contract.contractnumber,
            'Task Date': contract.taskdate,
            'Client Name': contract.clientname,
            'Address': contract.address,
            'Worker Number': contract.workernumber,
            'All Money': contract.allmoney
        }));

        const notPayContracts = batalyon.notPayContracts.map(contract => ({
            'Batalyon': batalyon.batalyonName,
            'Contract Type': 'Tolanmagan',
            'Contract Number': contract.contractnumber,
            'Task Date': contract.taskdate,
            'Client Name': contract.clientname,
            'Address': contract.address,
            'Worker Number': contract.workernumber,
            'All Money': contract.allmoney
        }));

        return [...payContracts, ...notPayContracts];
    });

    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [{ width: 20 }, { width: 20 }, { width: 15 }, { width: 80 }, { width: 80 }, { width: 80 }, { width: 15 }, { width: 15 }];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Contracts');

    const buffer = xlsx.write(workbook, { type: 'buffer' });
    const filename = `${Date.now()}_contracts.xlsx`;

    // Faylni saqlash
    await pool.query(`INSERT INTO files (filename, file_data) VALUES ($1, $2)`, [filename, buffer]);

    // Faylni qayta olish va jo'natish
    const fileResult = await pool.query(`SELECT filename, file_data FROM files WHERE filename = $1`, [filename]);

    if (fileResult.rows.length === 0) {
        return res.status(404).json({ message: 'Fayl topilmadi' });
    }

    const { file_data } = fileResult.rows[0];
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(file_data);
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

    const commands = await pool.query(`SELECT id, commandnumber, commanddate, date1, date2 FROM commands WHERE status = $1 AND commanddate BETWEEN $2 AND $3 AND user_id = $4
        `, [true, date1, date2, req.user.id])
    
    const result = commands.rows.map(command => {
        command.commanddate = returnStringDate(command.commanddate);
        command.date1 = returnStringDate(command.date1)
        command.date2 = returnStringDate(command.date2)
        return command;
   });

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