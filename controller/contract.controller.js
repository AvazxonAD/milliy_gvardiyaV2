const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const xlsx = require('xlsx')

const {
    returnDate,
    returnStringDate,
    returnLocalDate
} = require('../utils/date.function')

const {
    checkBattailonsIsNull,
    returnWorkerNumberAndAllMoney,
    returnBattalion,
    checkDateWithNowDate,
    checkBattalionName
} = require('../utils/contract.functions');

const { blockTask } = require('../utils/worker.tasks.function')
const pool = require("../config/db");

// create contract
exports.create = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    let {
        contractNumber,
        contractDate,
        clientName,
        clientAddress,
        clientMFO,
        clientAccount,
        clientSTR,
        treasuryAccount,
        treasuryaccount27,
        timeLimit,
        address,
        taskDate,
        taskTime,
        battalions,
        discount,
        accountNumber
    } = req.body;

    if (!contractNumber || !contractDate || !clientName || !timeLimit || !address || !taskDate || !taskTime || !accountNumber) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }

    if(clientAccount){
        if(clientAccount.toString().length !== 20){
            return next(new ErrorResponse("xisob raqami  raqami 20 xonali boishi kerak", 400))
        }
    }
    if(clientMFO){
        if(clientMFO.toString().length !== 5){
            return next(new ErrorResponse("mfo raqami 5 xonali boishi kerak", 400))
        }
    }
    if(clientSTR){
        if(clientSTR.toString().length !== 9){
            return next(new ErrorResponse("str raqami  raqami 9 xonali boishi kerak", 400))
        }
    }
    if(treasuryAccount){
        if(treasuryAccount.toString().length !== 25){
            return next(new ErrorResponse("g'aznichilik hisob   raqami  raqami 25 xonali boishi kerak", 400))
        }
    }
    if(treasuryaccount27){
        if(treasuryaccount27.toString().length !== 27){
            return next(new ErrorResponse(" 2-g'aznachilik hisob raqami 27 xonali boishi kerak", 400))
        }
    }
    if(treasuryAccount.length > 0 && treasuryaccount27.length > 0){
        return next(new ErrorResponse('Gaznachilik hisob raqamini ikki marta kiritdinggiz',400))
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

    if(taskDate < new Date()){
        return next(new ErrorResponse(`Topshiriq sanasini tog"ri kiriting bugunigi kundan katta bolishi kerak : ${returnStringDate(new Date())}`))
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
            accountnumber,
            treasuryaccount27,
            user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *`,
        [
            contractNumber,
            contractDate,
            clientName.trim(),
            clientAddress ? clientAddress : null,
            clientMFO ? clientMFO : null,
            clientAccount ? clientAccount : null,
            clientSTR ? clientSTR : null,
            treasuryAccount ? treasuryAccount : null,
            timeLimit,
            address.trim(),
            discount,
            forContract.workerNumber,
            Math.round((forContract.allMoney * 100) / 100),
            Math.round((oneTimeMoney * 100) / 100),
            Math.round((forContract.money * 100) / 100),
            Math.round((forContract.discountMoney * 100) / 100),
            taskTime,
            taskDate,
            accountNumber,
            treasuryaccount27 ? treasuryaccount27 : null,
            req.user.id
        ]
    );

    for (let battalion of forBattalion) {
        let tableName = null
        const user = await pool.query(`SELECT status, id FROM users WHERE username = $1 AND user_id = $2`, [battalion.name, req.user.id])
        if (user.rows[0].status) {
            tableName = `iib_tasks`
        } else {
            tableName = `tasks`
        }
        const task = await pool.query(
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
                address,
                discount,
                timelimit,
                user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
            RETURNING *`,
            [
                contract.rows[0].id,
                contractNumber,
                clientName,
                taskDate,
                battalion.workerNumber,
                Math.round((battalion.oneTimeMoney * 100) / 100),
                battalion.taskTime,
                Math.round((battalion.allMoney * 100) / 100),
                Math.round((battalion.money * 100) / 100),
                Math.round((battalion.discountMoney * 100) / 100),
                battalion.name,
                address.trim(),
                discount,
                timeLimit,
                user.rows[0].id
            ]
        );
    }
    return res.status(201).json({
        success: true,
        data: contract.rows[0]
    });
});

// update contracts 
exports.update = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }
    
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
        accountNumber,
        treasuryaccount27
    } = req.body;

    if (!contractNumber || !contractDate || !clientName || !timeLimit || !address || !taskDate || !taskTime || !accountNumber) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }

    if(clientMFO){
        if(clientMFO.toString().length !== 5){
            return next(new ErrorResponse("mfo raqami 5 xonali boishi kerak", 400))
        }
    }
    if(clientAccount){
        if(clientAccount.toString().length !== 20){
            return next(new ErrorResponse("xisob raqami  raqami 20 xonali boishi kerak", 400))
        }
    }
    if(clientSTR){
        if(clientSTR.toString().length !== 9){
            return next(new ErrorResponse("str raqami  raqami 9 xonali boishi kerak", 400))
        }
    }
    if(treasuryAccount){
        if(treasuryAccount.toString().length !== 25){
            return next(new ErrorResponse("g'aznichilik hisob   raqami  raqami 25 xonali boishi kerak", 400))
        }
    }
    if(treasuryaccount27){
        if(treasuryaccount27.toString().length !== 27){
            return next(new ErrorResponse(" 2-g'aznachilik hisob raqami 27 xonali boishi kerak", 400))
        }
    }
    if(treasuryAccount && treasuryaccount27){
        if(treasuryAccount.length > 0 && treasuryaccount27.length > 0){
            return next(new ErrorResponse('Gaznachilik hisob raqamini ikki marta kiritdinggiz',400))
        }
    }
    // Check battalions
    if (!checkBattailonsIsNull(battalions)) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }

    contractDate = returnDate(contractDate.trim());
    taskDate = returnDate(taskDate.trim());
    if (!contractDate || !taskDate) {
        return next(new ErrorResponse("Sana formatini to'g'ri kiriting: 'kun.oy.yil'. Masalan: 01.01.2024", 400));
    }

    // Fetch one-time money
    const bxm = await pool.query(`SELECT * FROM bxm`);
    const oneTimeMoney = Math.round(((bxm.rows[0].summa * 0.07) * 100) / 100);

    // Calculate contract details
    const forContract = returnWorkerNumberAndAllMoney(oneTimeMoney, battalions, discount, taskTime);
    const forBattalion = returnBattalion(oneTimeMoney, battalions, discount, taskTime);
    // Update contract
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
            accountnumber = $17,
            treasuryaccount27 = $18,
            taskdate = $19
        WHERE id = $20
        RETURNING *`,
        [
            contractNumber,
            contractDate,
            clientName,
            clientAddress ? clientAddress : null,
            clientMFO ? clientMFO : null,
            clientAccount ? clientAccount : null,
            clientSTR ? clientSTR : null,
            treasuryAccount ? treasuryAccount : null,
            timeLimit,
            address,
            discount,
            forContract.workerNumber,
            Math.round((forContract.allMoney * 100) / 100),
            Math.round((oneTimeMoney * 100) / 100),
            Math.round((forContract.money * 100) / 100),
            Math.round((forContract.discountMoney * 100) / 100),
            accountNumber,
            treasuryaccount27 ? treasuryaccount27 : null,
            taskDate,
            req.params.id
        ]
    );

    // Delete old tasks
    await pool.query(`DELETE FROM tasks WHERE contract_id = $1`, [req.params.id]);
    await pool.query(`DELETE FROM worker_tasks WHERE contract_id = $1`, [req.params.id]);
    await pool.query(`DELETE FROM iib_tasks WHERE contract_id = $1`, [req.params.id]);

    for (let battalion of forBattalion) {
        let tableName = null;
        const user = await pool.query(`SELECT status, id FROM users WHERE username = $1`, [battalion.name]);
        if (user.rows[0].status) {
            tableName = `iib_tasks`;
        } else {
            tableName = `tasks`;
        }

        const task = await pool.query(
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
                address,
                discount,
                timelimit,
                user_id,
                ispay
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
            RETURNING *`,
            [
                contract.rows[0].id,
                contractNumber,
                clientName,
                taskDate,
                battalion.workerNumber,
                Math.round((battalion.oneTimeMoney * 100) / 100),
                battalion.taskTime,
                Math.round((battalion.allMoney * 100) / 100),
                Math.round((battalion.money * 100) / 100),
                Math.round((battalion.discountMoney * 100) / 100),
                battalion.name,
                address,
                discount,
                timeLimit,
                user.rows[0].id,
                contract.rows[0].ispay
            ]
        );
    }
    return res.status(201).json({
        success: true,
        data: contract.rows
    });
});



// get all contracts
exports.getAllcontracts = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    if (limit <= 0 || page <= 0) {
        return next(new ErrorResponse("Limit va page musbat sonlar bo'lishi kerak", 400));
    }

    const offset = (page - 1) * limit;

    const contractsQuery = await pool.query(
        `SELECT id, contractnumber, contractdate, clientname, address 
        FROM contracts 
        WHERE user_id = $1
        ORDER BY contractnumber DESC
        OFFSET $2 
        LIMIT $3`,
        [req.user.id, offset, limit]
    );

    const result = contractsQuery.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate);
        return contract;
    });

    const totalQuery = await pool.query(`SELECT COUNT(id) AS total FROM contracts WHERE user_id = $1`, [req.user.id]);
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
        `SELECT id, contractnumber, contractdate, clientname, clientaddress, clientmfo, clientaccount, clientstr, treasuryaccount, address, ispay, timelimit
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

    let tests = blockTask(tasksQuery.rows)
    for (let test of tests) {
        await pool.query(`UPDATE tasks 
            SET notdone = $1, done = $2, inprogress = $3
            WHERE id = $4
        `, [true, false, false, test.id])
    }

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
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
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
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    
    const contract = await pool.query(`DELETE FROM contracts WHERE id = $1 RETURNING id `, [req.params.id])
    
    if (!contract.rows[0]) {
        return next(new ErrorResponse("server xatolik ochirib bolmadi", 500))
    }

    return res.status(200).json({
        success: true,
        data: "DELETE"
    })
})

// task's worker 
exports.taskOfWorker = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let workers = null
    if (req.query.task) {
        workers = await pool.query(`SELECT worker_name, tasktime, taskdate, task_id, id FROM worker_tasks WHERE task_id  = $1`, [req.params.id])
        workers = workers.rows.map(worker => {
            worker.taskdate = returnStringDate(worker.taskdate)
            return worker
        })
    }
    if (req.query.contract) {
        workers = await pool.query(`SELECT worker_name, tasktime, taskdate, task_id, id FROM worker_tasks WHERE contract_id = $1`, [req.params.id])
        workers = workers.rows.map(worker => {
            worker.taskdate = returnStringDate(worker.taskdate)
            return worker
        })
    }
    return res.status(200).json({
        success: true,
        data: workers
    })
})

// filter by date
exports.filterByDate = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    const { date1, date2 } = req.body;

    if (!date1 || !date2) {
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }

    const parsedDate1 = returnDate(date1);
    const parsedDate2 = returnDate(date2);

    if (!parsedDate1 || !parsedDate2) {
        return next(new ErrorResponse("Sana formati noto'g'ri kiritilgan. To'g'ri format: kun.oy.yil. Masalan: 12.12.2024", 400));
    }

    const contractsQuery = `
        SELECT id, contractnumber, contractdate, clientname, address
        FROM contracts
        WHERE  contractdate BETWEEN $1 AND $2 AND user_id = $3
    `;

    const contracts = await pool.query(contractsQuery, [parsedDate1, parsedDate2, req.user.id]);

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
    if (!req.user.adminstatus) {
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
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let { date } = req.body
    date = returnDate(date)
    if (!date) {
        return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    const test = checkDateWithNowDate(date)
    if (!test) {
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
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403))
    }
    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1 AND user_id = $2
    `, [false, req.user.id])

    res.status(200).json({
        success: true,
        data: batalyons.rows
    })
})

// search enterprice 
exports.search = asyncHandler(async (req, res, next) => {
    const { clientName } = req.body
    if (!clientName) {
        return next(new ErrorResponse("sorov bosh qolmasligi kerak", 400))
    }
    let contractQuery = await pool.query(
        `SELECT clientname, clientaddress, clientmfo, clientaccount, clientstr, treasuryaccount, address, timelimit
        FROM contracts
        WHERE clientname ILIKE '%' || $1 || '%' AND user_id = $2
        ORDER BY createdat DESC`,
    [clientName.trim(), req.user.id]);

    if (contractQuery.rows.length === 0) {
        return next(new ErrorResponse("Mos keladigan natijalar topilmadi", 404));
    }

    return res.status(200).json({
        success: true,
        data: contractQuery.rows,
    });

})

// import excel data 
exports.importExcelData = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("siz admin emassiz", 403));
    }

    if (!req.file) {
        return next(new ErrorResponse("file yuklanmadi", 400));
    }

    const fileBuffer = req.file.buffer;
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const datas = xlsx.utils.sheet_to_json(sheet, { defval: null }).map(row => {
        const newRow = {};
        const battalions = [];

        for (const key in row) {
            if (["81109", "81140", "84007", "89071", "98157", "98162", "Тошкент шаҳар МГ", "Тошкент Шаҳар ИИББ"].includes(key)) {
                if (row[key] !== null && row[key] !== 0) {
                    battalions.push({ name: key.trim(), workerNumber: row[key] });
                }
            } else {
                newRow[key.trim()] = row[key];
            }
        }

        if (battalions.length > 0) {
            newRow.battalions = battalions;
        }

        return newRow;
    });

    for (let data of datas) {
        if (!data || !data.clientname || !data.contractnumber || !data.contractdate || !data.tasktime || !data.timelimit || !data.taskdate || !data.address) {
            return next(new ErrorResponse("Sorovlar bosh qolishi mumkin emas excel fileni tekshiring", 400));
        }
    }

    let accountnumber = await pool.query(`SELECT accountnumber FROM accountnumber WHERE user_id = $1`, [req.user.id]);
    accountnumber = accountnumber.rows[0].accountnumber;

    for (let data of datas) {
        const isNull = checkBattailonsIsNull(data.battalions);
        if (!isNull) {
            return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
        }

        const testIsSame = checkBattalionName(data.battalions);
        if (!testIsSame) {
            return next(new ErrorResponse("Bitta shartnomada bitta organ bir marta tanlanishi kerak", 400));
        }

        let contractDate = returnDate(data.contractdate.toString().trim());
        let taskDate = returnDate(data.taskdate.toString().trim());

        if (!contractDate || !taskDate) {
            return next(new ErrorResponse("Sana formatini to'g'ri kiriting: 'kun.oy.yil'. Masalan: 01.01.2024", 400));
        }
    }

    for(let data of datas){
        const bxm = await pool.query(`SELECT * FROM bxm`);
        const oneTimeMoney = Math.round((bxm.rows[0].summa * 0.07) * 100) / 100;
        
        let contractDate = returnDate(data.contractdate.toString().trim());
        let taskDate = returnDate(data.taskdate.toString().trim());

        const forContract = returnWorkerNumberAndAllMoney(oneTimeMoney, data.battalions, null, data.tasktime);
        const forBattalion = returnBattalion(oneTimeMoney, data.battalions, null, data.tasktime);

        const contract = await pool.query(
            `INSERT INTO contracts (
                contractnumber, 
                contractdate, 
                clientname, 
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
                accountnumber,
                user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                data.contractnumber,
                contractDate,
                data.clientname.trim(),
                data.timelimit,
                data.address.trim(),
                null,
                forContract.workerNumber,
                forContract.allMoney,
                oneTimeMoney,
                forContract.money,
                forContract.discountMoney,
                data.tasktime,
                returnDate(data.taskdate.toString().trim()),
                accountnumber,
                req.user.id
            ]
        );

        for (let battalion of forBattalion) {
            const user = await pool.query(`SELECT status, id FROM users WHERE username = $1`, [battalion.name]);
            let tableName = null;
            if (user.rows[0].status) {
                tableName = `iib_tasks`;
            } else {
                tableName = `tasks`;
            }

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
                    address,
                    user_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    contract.rows[0].id,
                    data.contractnumber,
                    data.clientname,
                    taskDate,
                    battalion.workerNumber,
                    battalion.oneTimeMoney,
                    battalion.taskTime,
                    battalion.allMoney,
                    battalion.money,
                    battalion.discountMoney,
                    battalion.name,
                    data.address.trim(),
                    user.rows[0].id
                ]
            );
        }
    }

    return res.status(200).json({
        success: true,
        datas
    });
})

// import excel data 
exports.importExcelData = asyncHandler(async (req, res, next) => {
    if (!req.user || !req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    // Tekshirib ko'ring, req.file mavjud
    if (!req.file) {
        return next(new ErrorResponse("Fayl yuklanmadi", 400));
    }

    const fileBuffer = req.file.buffer;

    // xlsx.read yordamida faylni o'qish
    let workbook;
    try {
        workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch (error) {
        return next(new ErrorResponse("Faylni o'qishda xatolik yuz berdi", 500));
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Excel jadvalidan ma'lumotlarni o'qish
    let datas;
    try {
        datas = xlsx.utils.sheet_to_json(sheet, { defval: null }).map(row => {
            const newRow = {};
            const battalions = [];

            for (const key in row) {
                if (["81109", "81140", "84007", "89071", "98157", "98162", "Тошкент шаҳар МГ", "Тошкент Шаҳар ИИББ"].includes(key)) {
                    if (row[key] !== null && row[key] !== 0) {
                        battalions.push({ name: key.trim(), workerNumber: row[key] });
                    }
                } else {
                    newRow[key.trim()] = row[key];
                }
            }

            if (battalions.length > 0) {
                newRow.battalions = battalions;
            }

            return newRow;
        });
    } catch (error) {
        return next(new ErrorResponse("Excel faylni o'qishda xatolik yuz berdi", 500));
    }


    let accountnumberResult = await pool.query(`SELECT accountnumber FROM accountnumber WHERE user_id = $1`, [req.user.id]);
    if(!accountnumberResult.rows[0]){
        return next(new ErrorResponse('xisob raqamini kiriting spravichnik bolimidan', 400))
    }
    let accountnumber = accountnumberResult.rows[0].accountnumber;

    for (let data of datas) {
        const isNull = checkBattailonsIsNull(data.battalions);
        if (!isNull) {
            return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
        }

        const testIsSame = checkBattalionName(data.battalions);
        if (!testIsSame) {
            return next(new ErrorResponse("Bitta shartnomada bitta organ bir marta tanlanishi kerak", 400));
        }

        const contractDate = returnDate(data.contractdate.trim());
        const taskDate = returnDate(data.taskdate.trim());
        if (!contractDate || !taskDate) {
            return next(new ErrorResponse("Sana formatini to'g'ri kiriting: 'kun.oy.yil'. Masalan: 01.01.2024", 400));
        }

        for(let battalion of data.battalions){
            const user = await pool.query(`SELECT status, id FROM users WHERE username = $1 AND user_id = $2`, [battalion.name, req.user.id])
            if(!user.rows[0]){
                return next(new ErrorResponse(`Batalon nomi notog'ri : ${battalion.name}`))
            }
        }
    }

    for (let data of datas) {
        const bxm = await pool.query(`SELECT * FROM bxm`);
        const oneTimeMoney = Math.round((bxm.rows[0].summa * 0.07) * 100) / 100;

        const forContract = returnWorkerNumberAndAllMoney(oneTimeMoney, data.battalions, null, data.tasktime);
        const forBattalion = returnBattalion(oneTimeMoney, data.battalions, null, data.tasktime);
        const contractDate = returnDate(data.contractdate.toString().trim());
        const taskDate = returnDate(data.taskdate.toString().trim());

        const contractResult = await pool.query(
            `INSERT INTO contracts (
                contractnumber, 
                contractdate, 
                clientname, 
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
                accountnumber,
                user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                data.contractnumber,
                contractDate,
                data.clientname.trim(),
                data.timelimit,
                data.address ? data.address.trim() : 'address',
                null,
                forContract.workerNumber,
                forContract.allMoney,
                oneTimeMoney,
                forContract.money,
                forContract.discountMoney,
                data.tasktime,
                taskDate,
                accountnumber,
                req.user.id
            ]
        );

        // For loop to insert battalion data
        for (let battalion of forBattalion) {
            let tableName = null;
            const user = await pool.query(`SELECT status, id FROM users WHERE username = $1 AND user_id = $2`, [battalion.name, req.user.id])
            if (user.rows[0].status) {
                tableName = `iib_tasks`
            } else {
                tableName = `tasks`
            }
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
                    address,  
                    user_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    contractResult.rows[0].id,
                    data.contractnumber,
                    data.clientname,
                    taskDate,
                    battalion.workerNumber,
                    battalion.oneTimeMoney,
                    battalion.taskTime,
                    battalion.allMoney,
                    battalion.money,
                    battalion.discountMoney,
                    battalion.name,
                    data.address ? data.address.trim() : 'address',
                    user.rows[0].id
                ]
            );
        }
    }

    return res.status(200).json({
        success: true,
        datas
    });
});

// update contracts info 
exports.updateContractsInfo = asyncHandler(async (req, res, next) => {
    if (!req.user || !req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    const { 
        address,
        contractNumber, 
        contractDate, 
        clientName, 
        clientAccount, 
        clientAddress, 
        clientMFO, 
        clientSTR, 
        treasuryAccount,
        treasuryaccount27, 
        timeLimit, 
        accountNumber 
    } = req.body
    if(clientMFO){
        if(clientMFO.toString().length !== 5){
            return next(new ErrorResponse("mfo raqami 5 xonali boishi kerak", 400))
        }
    }
    if(clientAccount){
        if(clientAccount.toString().length !== 20){
            return next(new ErrorResponse("xisob raqami  raqami 20 xonali boishi kerak", 400))
        }
    }
    if(clientSTR){
        if(clientSTR.toString().length !== 9){
            return next(new ErrorResponse("str raqami  raqami 9 xonali boishi kerak", 400))
        }
    }
    if(treasuryAccount){
        if(treasuryAccount.toString().length !== 25){
            return next(new ErrorResponse("g'aznichilik hisob   raqami  raqami 25 xonali boishi kerak", 400))
        }
    }
    if(treasuryaccount27){
        if(treasuryaccount27.toString().length !== 27){
            return next(new ErrorResponse(" 2-g'aznachilik hisob raqami 27 xonali boishi kerak", 400))
        }
    }
    
    if(treasuryAccount.length > 0 && treasuryaccount27.length > 0){
        return next(new ErrorResponse('Gaznachilik hisob raqamini ikki marta kiritdinggiz',400))
    }

    if (!contractNumber || !contractDate || !clientName || !timeLimit || !address || !accountNumber) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }
    let date = returnDate(contractDate.toString().trim())
    const contract = await pool.query(`UPDATE contracts 
        SET contractnumber = $1, contractdate = $2, clientname= $3, timelimit = $4, clientaccount = $5, clientaddress = $6, clientmfo = $7, clientstr = $8, treasuryaccount = $9, accountnumber = $10, address = $11, treasuryAccount27 = $13
        WHERE id = $12
        RETURNING *
        `, [
        contractNumber,
        date,
        clientName,
        timeLimit,
        clientAccount ? clientAccount : null,
        clientAddress ? clientAddress : null,
        clientMFO ? clientMFO : null,
        clientSTR ? clientSTR : null,
        treasuryAccount ? treasuryAccount : null,
        accountNumber,
        address,
        req.params.id,
        treasuryaccount27 ? treasuryaccount27 : null
    ])
    await pool.query(`UPDATE tasks SET timelimit = $1 WHERE contract_id = $2`, [contract.rows[0].timelimit, req.params.id])
    await pool.query(`UPDATE iib_tasks SET timelimit = $1 WHERE contract_id = $2`, [contract.rows[0].timelimit, req.params.id])

    return res.status(200).json({
        success: true,
        data: contract.rows[0]
    })
})

// search contract by number 
exports.searchByNumber = asyncHandler(async (req, res, next) => {
    if (!req.user || !req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }
    
    const { contractNumber } = req.body
    if (!contractNumber) {
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }

    const contract = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address 
        FROM contracts 
        WHERE contractnumber = $1 AND user_id = $2
    `, [contractNumber, req.user.id])
    
    const resultArray = contract.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate)
        return contract
    })

    return res.status(200).json({
        success: true,
        data: resultArray
    })
})

// search contract by client name  
exports.searchByClientName = asyncHandler(async (req, res, next) => {
    if (!req.user || !req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }
    
    const { clientName } = req.body
    if (!clientName) {
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }
    const contract = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address FROM contracts 
        WHERE clientname ILIKE '%' || $1 || '%' AND user_id = $2
    `, [clientName.trim(), req.user.id])
    
    const resultArray = contract.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate)
        return contract
    })

    return res.status(200).json({
        success: true,
        data: resultArray
    })
})

// search contract by address  
exports.searchByAddress = asyncHandler(async (req, res, next) => {
    if (!req.user || !req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }
    
    const { address } = req.body
    if (!address) {
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }

    const contract = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address 
        FROM contracts 
        WHERE address ILIKE '%' || $1 || '%' AND user_id = $2
    `, [address.trim(), req.user.id])
    
    const resultArray = contract.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate)
        return contract
    })

    return res.status(200).json({
        success: true,
        data: resultArray
    })
})

// create excel for report 
exports.createExcelForReport = asyncHandler(async (req, res, next) => {
    if (!req.user.adminstatus) {
        return next(new ErrorResponse("Siz admin emassiz", 403));
    }

    const { date1, date2 } = req.body;

    if (!date1 || !date2) {
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400));
    }

    const parsedDate1 = returnDate(date1);
    const parsedDate2 = returnDate(date2);

    if (!parsedDate1 || !parsedDate2) {
        return next(new ErrorResponse("Sana formati noto'g'ri kiritilgan. To'g'ri format: kun.oy.yil. Masalan: 12.12.2024", 400));
    }

    const contracts = await pool.query(`
        SELECT 
        id, clientname, contractnumber, contractdate, money, discount, discountmoney, allmoney, allworkernumber, tasktime, timelimit  
        FROM contracts 
        where contractdate BETWEEN $1 AND $2 AND user_id = $3
        ORDER BY contractnumber
    `, [parsedDate1, parsedDate2, req.user.id]);

    if(!contracts.rows.length){
        return next(new ErrorResponse('Bu vaqt orasida contractlar mavjud emas', 400))
    }

    const battalions = await pool.query(`SELECT username FROM users WHERE adminstatus = $1 AND status = $2 AND user_id = $3`, [false, false, req.user.id]);
    const iib_battalions = await pool.query(`SELECT username FROM users WHERE adminstatus = $1 AND status = $2 AND user_id = $3`, [false, true, req.user.id]);
    
    let resultArray = [];
    for (let contract of contracts.rows) {
        let battalionsArray = [];
        const tasks = await pool.query(`SELECT clientname, workernumber, money, battalionname FROM tasks WHERE contract_id = $1`, [contract.id]);
        const iib_tasks = await pool.query(`SELECT clientname, workernumber, money, battalionname FROM iib_tasks WHERE contract_id = $1`, [contract.id]);

        for (let battalion of battalions.rows) {
            let task = tasks.rows.find(task => task.battalionname === battalion.username) || { workernumber: 0, money: 0 };
            battalionsArray.push({
                battalionname: battalion.username,
                workernumber: task.workernumber,
                money: task.money
            });
        }

        for (let battalion of iib_battalions.rows) {
            let task = iib_tasks.rows.find(task => task.battalionname === battalion.username) || { workernumber: 0, money: 0 };
            battalionsArray.push({
                battalionname: battalion.username,
                workernumber: task.workernumber,
                money: task.money
            });
        }

        let obj = { ...contract };
        obj.contractdate = returnStringDate(obj.contractdate);
        obj.battalions = battalionsArray;
        resultArray.push(obj);
    }

    const workbook = xlsx.utils.book_new();

    const worksheetData = resultArray.map(contract => {
        const row = {
            'Mijoz nomi': contract.clientname,
            'Shartnoma raqami': contract.contractnumber,
            'Shartnoma sanasi': contract.contractdate,
            'summa': contract.money,
            'Chegirma': contract.discount ? contract.discount : 0,
            'Chegirma summa': contract.discountmoney ? contract.discountmoney : 0,
            'Jami summa': contract.allmoney,
            'Xodimlar soni': contract.allworkernumber,
            'boshlanish va tugash sanansi': contract.timelimit
        };

        contract.battalions.forEach(battalion => {
            row[`${battalion.battalionname} - Xodimlar soni`] = battalion.workernumber;
            row[`${battalion.battalionname} - Summa`] = battalion.money;
        });

        return row;
    });

    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    
    // Ustun kengliklarini belgilash
    worksheet['!cols'] = [
        { width: 50 }, // Mijoz nomi
        { width: 15 }, // Shartnoma raqami
        { width: 20 }, // Shartnoma sanasi
        { width: 15 }, // Umumiy summa
        { width: 10 }, // Chegirma
        { width: 20 }, // Chegirma qilingan summa
        { width: 15 }, // Jami summa
        { width: 15 }, // Xodimlar soni
        { width: 50 }  // boshlanish va tugash sanansi
    ];

    // Qo'shimcha ustunlar uchun kengliklar
    const extraColumns = resultArray[0].battalions.length * 2;
    for (let i = 0; i < extraColumns; i++) {
        worksheet['!cols'].push({ width: 30 });
    }

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Shartnomalar');

    const buffer = xlsx.write(workbook, { type: 'buffer' });
    res.setHeader('Content-Disposition', `attachment; filename=data_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buffer);
});