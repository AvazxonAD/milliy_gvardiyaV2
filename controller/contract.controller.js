const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const {
    returnDate,
    returnStringDate,
    returnLocalDate
} = require('../utils/date.function')

const {
    checkBattailonsIsNull,
    returnWorkerNumberAndAllMoney,
    returnBattalion,
    blockTasks,
    checkDateWithNowDate,
    checkBattalionName
} = require('../utils/contract.functions');
const pool = require("../config/db");

// create contract
exports.create = asyncHandler(async (req, res, next) => {
    let { 
        contractNumber, 
        contractDate, 
        clientName, 
        clientAddress, 
        clientMFO, 
        clientAccount, 
        clientSTR, 
        treasuryAccount, 
        timeLimit,
        address,
        taskDate,
        taskTime,
        battalions,
        discount,
        accountNumber
    } = req.body;

    // Required fields validation
    if (!contractNumber || !contractDate || !clientName || !timeLimit || !address || !taskDate || !taskTime || !accountNumber) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }   

    const isNull = checkBattailonsIsNull(battalions);
    if (!isNull) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }

    const testIsSame = checkBattalionName(battalions);
    if (!testIsSame) {
        return next(new ErrorResponse("Bitta shartnomada bitta organ bir marta tanlanishi kerak", 400));
    }

    contractDate = returnDate(contractDate.trim());
    taskDate = returnDate(taskDate.trim());
    if (!contractDate || !taskDate) {
        return next(new ErrorResponse("Sana formatini to'g'ri kiriting: 'kun.oy.yil'. Masalan: 01.01.2024", 400));
    }

    const bxm = await pool.query(`SELECT * FROM bxm`);
    const oneTimeMoney = Math.round((bxm.rows[0].summa * 0.07) * 100) / 100;

    const forContract = returnWorkerNumberAndAllMoney(oneTimeMoney, battalions, discount, taskTime);
    const forBattalion = returnBattalion(oneTimeMoney, battalions, discount, taskTime);

    const contract = await pool.query(
        `INSERT INTO contracts (
            contractnumber, 
            contractdate, 
            clientname, 
            clientaddress, 
            clientmfo, 
            clientaccount, 
            clientstr, 
            treasuryaccount,
            timelimit, 
            address, 
            discount,
            allworkernumber,
            allmoney,
            timemoney,
            money,
            discountmoney,
            tasktime,
            taskdate,
            accountnumber
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`, 
        [
            contractNumber, 
            contractDate, 
            clientName.trim(), 
            clientAddress ? clientAddress.trim() : null, 
            clientMFO, 
            clientAccount ? clientAccount.trim() : null, 
            clientSTR, 
            treasuryAccount ? treasuryAccount.trim() : null, 
            timeLimit, 
            address.trim(),  
            discount,
            forContract.workerNumber,
            forContract.allMoney,
            oneTimeMoney,
            forContract.money,
            forContract.discountMoney,
            taskTime,
            taskDate,
            accountNumber
        ]
    );

    for (let battalion of forBattalion) {
        const tableName = (battalion.name === "Toshkent Shahar IIBB" || battalion.name === "98162" || battalion.name === "98157") ? 'iib_tasks' : 'tasks';

        await pool.query(
            `INSERT INTO ${tableName} (
                contract_id,
                contractnumber,
                clientname,
                taskdate,
                workernumber,
                timemoney,
                tasktime,
                allmoney,
                money,
                discountmoney,
                battalionname,
                address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, 
            [
                contract.rows[0].id,
                contractNumber,
                clientName,
                taskDate,
                battalion.workerNumber,
                battalion.oneTimeMoney,
                battalion.taskTime,
                battalion.allMoney,
                battalion.money,
                battalion.discountMoney,
                battalion.name,
                address
            ]
        );
    }

    return res.status(201).json({
        success: true,
        data: contract.rows[0]
    });
});

// update contract 
exports.update = asyncHandler(async (req, res, next) => {
    let  { 
        contractNumber, 
        contractDate, 
        clientName, 
        clientAddress, 
        clientMFO, 
        clientAccount, 
        clientSTR, 
        treasuryAccount, 
        timeLimit,
        address,
        taskDate,
        taskTime,
        battalions,
        discount,
        accountNumber
    } = req.body;
    
    if(!contractNumber || !contractDate ||  !clientName || !timeLimit || !address || !taskDate || !taskTime  || !accountNumber){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin", 403));
    }

    const isNull = checkBattailonsIsNull(battalions);
    if(!isNull){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin", 403));
    }

    contractDate = returnDate(contractDate);
    taskDate = returnDate(taskDate);
    if(!contractDate || !taskDate) {
        return next(new ErrorResponse("sana formatini togri kiriting 'kun.oy.yil'. Masalan : 01.01.2024"));
    }

    const bxm = await pool.query(`SELECT * FROM bxm`);
    const oneTimeMoney = Math.round(((bxm.rows[0].summa * 0.07) * 100) / 100);

    const forContract = returnWorkerNumberAndAllMoney(oneTimeMoney, battalions, discount, taskTime);
    const forBattalion = returnBattalion(oneTimeMoney, battalions, discount, taskTime);
    const contract = await pool.query(
        `UPDATE contracts SET 
            contractnumber = $1, 
            contractdate = $2, 
            clientname = $3, 
            clientaddress = $4, 
            clientmfo = $5, 
            clientaccount = $6, 
            clientstr = $7, 
            treasuryaccount = $8, 
            timelimit = $9, 
            address = $10, 
            discount = $11,
            allworkernumber = $12,
            allmoney = $13,
            timemoney = $14,
            money = $15,
            discountmoney = $16,
            accountnumber = $17
        WHERE id = $18
        RETURNING id`,
        [ 
            contractNumber, 
            contractDate, 
            clientName, 
            clientAddress, 
            clientMFO, 
            clientAccount, 
            clientSTR, 
            treasuryAccount, 
            timeLimit, 
            address,  
            discount,
            forContract.workerNumber,
            forContract.allMoney,
            oneTimeMoney,
            forContract.money,
            forContract.discountMoney,
            accountNumber,
            req.params.id
        ]
    );

    await pool.query(`DELETE FROM tasks WHERE contract_id = $1`, [req.params.id]);
    await pool.query(`DELETE FROM iib_tasks WHERE contract_id = $1`, [req.params.id]);
    
    for(let battalion of forBattalion){
        if(battalion.name === "Toshkent Shahar IIBB" || battalion.name === "98162" || battalion.name === "98157"){
            await pool.query(`INSERT INTO iib_tasks (
                contract_id,
                contractnumber,
                clientname,
                taskDate,
                workernumber,
                timemoney,
                tasktime,
                allmoney,
                money,
                discountmoney,
                battalionname,
                address
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                contract.rows[0].id,
                contractNumber,
                clientName,
                taskDate,
                battalion.workerNumber,
                battalion.oneTimeMoney,
                battalion.taskTime,
                battalion.allMoney,
                battalion.money,
                battalion.discountMoney,
                battalion.name,
                address
            ]);
        } else {
            await pool.query(`INSERT INTO tasks (
                contract_id,
                contractnumber,
                clientname,
                taskDate,
                workernumber,
                timemoney,
                tasktime,
                allmoney,
                money,
                discountmoney,
                battalionname,
                address
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                contract.rows[0].id,
                contractNumber,
                clientName,
                taskDate,
                battalion.workerNumber,
                battalion.oneTimeMoney,
                battalion.taskTime,
                battalion.allMoney,
                battalion.money,
                battalion.discountMoney,
                battalion.name,
                address
            ]);
        }
    }

    return res.status(201).json({
        success: true,
        data: "yangilandi"
    });
});

// get all contracts
exports.getAllcontracts = asyncHandler(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    if (limit <= 0 || page <= 0) {
        return next(new ErrorResponse("Limit va page musbat sonlar bo'lishi kerak", 400));
    }

    const offset = (page - 1) * limit;

    const contractsQuery = await pool.query(
        `SELECT id, contractnumber, contractdate, clientname, address 
        FROM contracts 
        ORDER BY contractdate DESC 
        OFFSET $1 
        LIMIT $2`, 
        [offset, limit]
    );

    const result = contractsQuery.rows.map(contract => { 
        contract.contractdate = returnStringDate(contract.contractdate);
        return contract;
    });

    const totalQuery = await pool.query(`SELECT COUNT(id) AS total FROM contracts`);
    const total = parseInt(totalQuery.rows[0].total);
    const pageCount = Math.ceil(total / limit);

    return res.status(200).json({
        success: true,
        pageCount: pageCount,
        count: total,
        currentPage: page,
        nextPage: page >= pageCount ? null : page + 1,
        backPage: page === 1 ? null : page - 1,
        data: result
    });
});


// get contract and all tasks
exports.getContractAndTasks = asyncHandler(async (req, res, next) => {
    const contractId = req.params.id;

    let contractQuery = await pool.query(
        `SELECT id, contractnumber, contractdate, clientname, clientaddress, clientmfo, clientaccount, clientstr, treasuryaccount, address, ispay 
        FROM contracts WHERE id = $1`, 
        [contractId]
    );

    if (contractQuery.rows.length === 0) {
        return next(new ErrorResponse("Shartnoma topilmadi", 404));
    }

    let contract = contractQuery.rows[0];
    contract.contractdate = returnStringDate(contract.contractdate);

    let tasksQuery = await pool.query(
        `SELECT id, battalionname, taskdate, workernumber, inprogress, done, notdone 
        FROM tasks 
        WHERE contract_id = $1`, 
        [contractId]
    );

    let iibTasksQuery = await pool.query(
        `SELECT id, battalionname, taskdate, workernumber 
        FROM iib_tasks 
        WHERE contract_id = $1`, 
        [contractId]
    );

    let tasks = tasksQuery.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    let iibTasks = iibTasksQuery.rows.map(task => {
        task.taskdate = returnStringDate(task.taskdate);
        return task;
    });

    let allTasks = tasks.concat(iibTasks);

    return res.status(200).json({
        success: true,
        data: [contract],
        tasks: allTasks
    });
});

// to print
exports.toPrint = asyncHandler(async (req, res, next) => {
    const contractId = req.params.id;

    const contractQuery = await pool.query(`SELECT * FROM contracts WHERE id = $1`, [contractId]);

    if (contractQuery.rows.length === 0) {
        return next(new ErrorResponse("Shartnoma topilmadi", 404));
    }

    let contract = contractQuery.rows[0];
    contract.contractdate = returnStringDate(contract.contractdate);
    contract.taskdate = returnLocalDate(contract.taskdate);

    const tasksQuery = await pool.query(`SELECT id, battalionname, workernumber, timemoney, tasktime, allmoney, money, discountmoney FROM tasks WHERE contract_id = $1`, [contractId]);
    const iibTasksQuery = await pool.query(`SELECT id, battalionname, workernumber, timemoney, tasktime, allmoney, money, discountmoney FROM iib_tasks WHERE contract_id = $1`, [contractId]);

    let allTasks = tasksQuery.rows.concat(iibTasksQuery.rows);

    return res.status(200).json({
        success: true,
        data: [contract],
        tasks: allTasks
    });
});

// delete contract 
exports.deleteContract = asyncHandler(async (req, res, next) => {
    const contract  = await pool.query(`DELETE FROM contracts WHERE id = $1 RETURNING id `, [req.params.id])
    
    if(!contract.rows[0]){
        return next(new ErrorResponse("server xatolik ochirib bolmadi", 500))
    }

    return res.status(200).json({
        success: true,
        data: "DELETE"
    })
})

// task's worker 
exports.taskOfWorker = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    let workers = null 
    if(req.query.task){
        workers = await pool.query(`SELECT worker_name FROM worker_tasks WHERE task_id  = $1`, [req.params.id])
    }
    if(req.query.contract){
        workers = await pool.query(`SELECT worker_name FROM worker_tasks WHERE contract_id = $1`, [req.params.id])
    }
    return res.status(200).json({
        success: true,
        data: workers.rows
    })
})

// filter by date
exports.filterByDate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    const { date1, date2 } = req.body;

    const parsedDate1 = returnDate(date1);
    const parsedDate2 = returnDate(date2);

    if (!parsedDate1 || !parsedDate2) {
        return next(new ErrorResponse("Sana formati noto'g'ri kiritilgan. To'g'ri format: kun.oy.yil. Masalan: 12.12.2024", 400));
    }

    const contractsQuery = `
        SELECT id, contractnumber, contractdate, clientname, address
        FROM contracts
        WHERE contractdate BETWEEN $1 AND $2
    `;

    const contracts = await pool.query(contractsQuery, [parsedDate1, parsedDate2]);

    // Sanani qayta ishlash va formatlash
    const formattedContracts = contracts.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate);
        return contract;
    });

    return res.status(200).json({
        success: true,
        data: formattedContracts
    });
});

// payment contract 
exports.paymentContract = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    const contract = await pool.query(`UPDATE contracts SET ispay = $1 WHERE id = $2 RETURNING id`, [true, req.params.id])
    

    await pool.query(`UPDATE worker_tasks SET ispay = $1 WHERE contract_id = $2`, [true, contract.rows[0].id])
    await pool.query(`UPDATE iib_tasks SET ispay = $1 WHERE contract_id = $2`, [true, contract.rows[0].id])
    
    return res.status(200).json({
        success: true,
        data: "Muvaffiqiyatli amalga oshirildi"
    })
})

// giving time to task 
exports.givingTimeToTask = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let  {date} = req.body
    date = returnDate(date)
    if(!date){
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    const test = checkDateWithNowDate(date)
    if(!test){
        const nowDate = returnStringDate(new Date())
        return next(new ErrorResponse(`topshiriq vaqtini uzytrish uchun siz hozirgi kundan hech bolmasa bir kun koproq vaqt berishinggiz kerak. Hozirgi vaqt : ${nowDate}`, 400))
    }

    const task = await pool.query(`
        UPDATE tasks 
        SET taskdate = $1, inprogress = $2, done = $3, notdone = $4
        WHERE id = $5 AND notdone = $6
        RETURNING id, battalionname, taskdate, workernumber, inprogress, done, notdone 
    `, [date, true, false, false, req.params.id, true])

    return res.status(200).json({
        success: true,
        data: task.rows[0]
    })

})

// for contract batalyons 
exports.forContractBatalyonns = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1
    `, [false])
    
    res.status(200).json({
        success: true,
        data: batalyons.rows
    })
})

// search enterprice 
exports.search = asyncHandler(async (req, res, next) => {
    const {clientName} = req.body
    if(!clientName){
        return next(new ErrorResponse("sorov bosh qolmasligi kerak", 400))
    }

    let contractQuery = await pool.query(
        `SELECT clientname, clientaddress, clientmfo, clientaccount, clientstr, treasuryaccount, address, timelimit
        FROM contracts WHERE clientname = $1
        ORDER BY createdat DESC`, 
        [clientName.trim()]
    );

    return res.status(200).json({
        success: true,
        data: contractQuery.rows[0],
    });
})