const pool = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const { returnDate } = require("../utils/date.function");
const ErrorResponse = require("../utils/errorResponse");
const xlsx = require('xlsx')
// get all tasks 
exports.getAllTasks = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse('Siz admin emassiz', 403));
    }
    
    const battalionname = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id])
    if(!battalionname.rows[0]){
        return next(new ErrorResponse('server xxatolik', 500))
    }

    const tasks = await pool.query(
        `SELECT tasks.contractnumber, contracts.timelimit, tasks.clientname, tasks.address, 
                tasks.workernumber, tasks.allmoney, tasks.ispay
         FROM tasks
         JOIN contracts ON tasks.contract_id = contracts.id
         WHERE tasks.user_id = $1
         ORDER BY contractnumber`, 
        [req.params.id]
    );
    const resultTasks = tasks.rows.map(data => {
        const task = {...data};
        if (task.ispay) {
            task.D_T = task.allmoney;
            task.K_R_T = 0;
        } else{
            task.D_T = 0;
            task.K_R_T = task.allmoney;
        }
        return task;
    });
    let summa = await pool.query(
        `SELECT SUM(allmoney)
         FROM tasks
         WHERE tasks.user_id = $1 AND ispay = $2
         `, 
        [req.params.id, true]
    );
    summa = summa.rows[0].sum || 0
    
    let notPaySummma = await pool.query(
        `SELECT SUM(allmoney)
         FROM tasks
         WHERE tasks.user_id = $1 AND ispay = $2
         `, 
        [req.params.id, false]
    );
     notPaySummma = notPaySummma.rows[0].sum || 0 

    return res.status(200).json({
        success: true, 
        data: {
            allmoney: notPaySummma + summa,
            summa,
            notPaySummma,
            battalionname: battalionname.rows[0].username,
            tasks: resultTasks
        }
    });
});

// filter by 
exports.filterByDate = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse('Siz admin emassiz', 403));
    }
    
    const battalionname = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id])
    if(!battalionname.rows[0]){
        return next(new ErrorResponse('server xxatolik', 500))
    }

    let {date1, date2} = req.body
    date1 = returnDate(date1.trim())
    date2 = returnDate(date2.trim())
    if(!date1 || !date2){
        return next(new ErrorResponse('Sana notog`ri kiritildi. Tog`ri format: 12.12.2024', 400))
    }

    const tasks = await pool.query(
        `SELECT tasks.contractnumber, contracts.timelimit, tasks.clientname, tasks.address, 
            tasks.workernumber, tasks.allmoney, tasks.ispay
         FROM tasks
         JOIN contracts ON tasks.contract_id = contracts.id
         WHERE tasks.user_id = $1 AND tasks.taskdate BETWEEN $2 AND $3
         ORDER BY contractnumber`, 
        [req.params.id, date1, date2]
    );

    if(tasks.rows.length === 0){
        return next(new ErrorResponse('Data topilmadi', 404))
    }

    const resultTasks = tasks.rows.map(data => {
        const task = {...data};
        if (task.ispay) {
            task.D_T = task.allmoney;
            task.K_R_T = 0;
        } else{
            task.D_T = 0;
            task.K_R_T = task.allmoney;
        }
        return task;
    });

    let summa = await pool.query(
        `SELECT SUM(allmoney)
         FROM tasks
         WHERE tasks.user_id = $1 AND ispay = $2 AND tasks.taskdate BETWEEN $3 AND $4
         `, 
        [req.params.id, true, date1, date2]
    );
    summa = summa.rows[0].sum || 0
    
    let notPaySummma = await pool.query(
        `SELECT SUM(allmoney)
         FROM tasks
         WHERE tasks.user_id = $1 AND ispay = $2 AND tasks.taskdate BETWEEN $3 AND $4
         `, 
        [req.params.id, false, date1, date2]
    );
     notPaySummma = notPaySummma.rows[0].sum || 0 

    return res.status(200).json({
        success: true, 
        data: {
            allmoney: notPaySummma + summa,
            summa,
            notPaySummma,
            battalionname: battalionname.rows[0].username,
            tasks: resultTasks
        }
    });
})

// exports excel 
exports.exportsToExcel = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse('Siz admin emassiz', 403));
    }

    const {data} = req.body;
    if(data.tasks.length === 0){
        return next(new ErrorResponse('Server xatolik', 500));
    }

    const worksheetData = data.tasks.map(task => ({
        'contractnumber': task.contractnumber,
        'Tadbir sanasi': task.timelimit,
        'Mijoz nomi': task.clientname,
        'Address': task.address,
        'Xodim soni': task.workernumber,
        'Shartnoma summasi': task.allmoney,
        'Д-Т': task.ispay ? task.allmoney : 0,
        'КР-Т': !task.ispay ? task.allmoney : 0
    }));

    // worksheetData2 ni massivga joylashtiramiz
    const worksheetData2 = [{
        'battalionname': data.battalionname,
        'Shartnoma summasi jami': data.allmoney,
        'Д-Т': data.summa,
        'КР-Т': data.notPaySummma
    }];
    
    const workbook = xlsx.utils.book_new();
    
    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [{ width: 15 }, { width: 60 }, { width: 40 }, { width: 50 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Mijozlar');
    
    const worksheet2 = xlsx.utils.json_to_sheet(worksheetData2);
    worksheet2['!cols'] = [{ width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];
    xlsx.utils.book_append_sheet(workbook, worksheet2, 'Summalar');
    
    const buffer = xlsx.write(workbook, { type: 'buffer' });
    const filename = `${Date.now()}_data.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});


// all tasks 
exports.allTasks = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse('Siz admin emassiz', 403));
    }

    const result = [];
    const battalions = await pool.query(`SELECT * FROM users WHERE user_id = $1 AND status = $2`, [req.user.id, false]);

    await Promise.all(battalions.rows.map(async (battalion) => {
        const tasks = await pool.query(`
            SELECT tasks.contractnumber, contracts.timelimit, tasks.clientname, tasks.address, 
                tasks.workernumber, tasks.allmoney, tasks.ispay
            FROM tasks
            JOIN contracts ON tasks.contract_id = contracts.id
            WHERE tasks.user_id = $1
            ORDER BY contractnumber
        `, [battalion.id]);

        const resultTasks = tasks.rows.map(data => {
            const task = {...data};
            if (task.ispay) {
                task.D_T = task.allmoney;
                task.K_R_T = 0;
            } else {
                task.D_T = 0;
                task.K_R_T = task.allmoney;
            }
            return task;
        });

        let notPaySummmaResult = await pool.query(`SELECT SUM(allmoney) FROM tasks WHERE user_id = $1 AND ispay = $2`, [battalion.id, false]);
        let notPaySummma = parseFloat(notPaySummmaResult.rows[0].sum) || 0;

        let summaResult = await pool.query(`SELECT SUM(allmoney) FROM tasks WHERE user_id = $1 AND ispay = $2`, [battalion.id, true]);
        let summa = parseFloat(summaResult.rows[0].sum) || 0;

        const allmoney = notPaySummma + summa;

        if(resultTasks.length !== 0 ){
            result.push({
                battalionname: battalion.username,
                allmoney,
                summa,
                notPaySummma,
                tasks: resultTasks
            });
        }
    }));

    return res.status(200).json({
        success: true,
        data: result
    });
});

// all tasks filter by date 
exports.allTasksFilterByDate = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse('Siz admin emassiz', 403));
    }
    let {date1, date2} = req.body
    if(!date1 || !date2){
        return next(new ErrorResponse("so'rovlar bo'sh qolishi mumkin emas", 400))
    }
    date1 = returnDate(date1.trim())
    date2 = returnDate(date2.trim())
    if(!date1 || !date2){
        return next(new ErrorResponse("Sana notog'ri kiritildi. Tog'ri format : kun.oy.yil. Masalan : 12.12.2024"))
    }

    const result = [];
    const battalions = await pool.query(`SELECT * FROM users WHERE user_id = $1 AND status = $2`, [req.user.id, false]);

    await Promise.all(battalions.rows.map(async (battalion) => {
        const tasks = await pool.query(`
            SELECT tasks.contractnumber, contracts.timelimit, tasks.clientname, tasks.address, 
                tasks.workernumber, tasks.allmoney, tasks.ispay
            FROM tasks
            JOIN contracts ON tasks.contract_id = contracts.id
            WHERE tasks.user_id = $1 AND tasks.taskdate BETWEEN $2 AND $3
            ORDER BY contractnumber
        `, [battalion.id, date1, date2]);

        const resultTasks = tasks.rows.map(data => {
            const task = {...data};
            if (task.ispay) {
                task.D_T = task.allmoney;
                task.K_R_T = 0;
            } else {
                task.D_T = 0;
                task.K_R_T = task.allmoney;
            }
            return task;
        });

        let notPaySummmaResult = await pool.query(`SELECT SUM(allmoney) FROM tasks WHERE user_id = $1 AND ispay = $2 AND taskdate BETWEEN $3 AND $4
        `, [battalion.id, false, date1, date2]);
        let notPaySummma = parseFloat(notPaySummmaResult.rows[0].sum) || 0;

        let summaResult = await pool.query(`SELECT SUM(allmoney) FROM tasks WHERE user_id = $1 AND ispay = $2 AND taskdate BETWEEN $3 AND $4
        `, [battalion.id, true, date1, date2]);
        let summa = parseFloat(summaResult.rows[0].sum) || 0;

        const allmoney = notPaySummma + summa;

        if(resultTasks.length !== 0){
            result.push({
                battalionname: battalion.username,
                allmoney,
                summa,
                notPaySummma,
                tasks: resultTasks
            });
        }
    }));

    return res.status(200).json({
        success: true,
        data: result
    });
})

// all tasks exports to excel 
exports.allTasksExportsToExcel = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse('Siz admin emassiz', 403));
    }
    const {data} = req.body

    const workbook = xlsx.utils.book_new();
    
    data.forEach(battalion => {
        const worksheetData = battalion.tasks.map(task => ({
            'battalionname': battalion.battalionname,
            'contractnumber': task.contractnumber,
            'Tadbir sanasi': task.timelimit,
            'Mijoz nomi': task.clientname,
            'Address': task.address,
            'Xodim soni': task.workernumber,
            'Shartnoma summasi': task.allmoney,
            'Д-Т': task.D_T,
            'КР-Т': task.K_R_T
        }));
    
        const worksheetData2 = [{
            'battalionname': battalion.battalionname,
            'Shartnoma summasi jami': battalion.allmoney,
            'Д-Т': battalion.summa,
            'КР-Т': battalion.notPaySummma
        }];

        const worksheet = xlsx.utils.json_to_sheet(worksheetData);
        worksheet['!cols'] = [{ width: 15 }, { width: 15 }, { width: 60 }, { width: 40 }, { width: 50 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];
        xlsx.utils.book_append_sheet(workbook, worksheet, `${battalion.battalionname} Mijozlar`);
        
        const worksheet2 = xlsx.utils.json_to_sheet(worksheetData2);
        worksheet2['!cols'] = [{ width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];
        xlsx.utils.book_append_sheet(workbook, worksheet2, `${battalion.battalionname} Summalar`);
    });

    const buffer = xlsx.write(workbook, { type: 'buffer' });
    const filename = `${Date.now()}_data.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});
