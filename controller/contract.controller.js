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
    console.log(req.body)
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
            Math.round((forContract.allMoney * 100) / 100),
            Math.round((oneTimeMoney * 100) / 100),
            Math.round((forContract.money * 100) / 100),
            Math.round((forContract.discountMoney * 100) / 100),
            taskTime,
            taskDate,
            accountNumber
        ]
    );

    for (let battalion of forBattalion) {
        let tableName = null
        const user = await pool.query(`SELECT status FROM users WHERE username = $1`, [battalion.name])
        if(user.rows[0].status){
            tableName = `iib_tasks`
        }else{
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
                discount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
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
                discount
            ]
        );
    }

    return res.status(201).json({
        success: true,
        data: contract.rows[0]
    });
});

exports.update = asyncHandler(async (req, res, next) => {
    const {
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

    // Check required fields
    if (!contractNumber || !contractDate || !clientName || !timeLimit || !address || !taskDate || !taskTime || !accountNumber) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }

    // Check battalions
    if (!checkBattailonsIsNull(battalions)) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }

    // Format dates
    const formattedContractDate = returnDate(contractDate);
    const formattedTaskDate = returnDate(taskDate);

    if (!formattedContractDate || !formattedTaskDate) {
        return next(new ErrorResponse("Sana formatini to'g'ri kiriting. Masalan: 01.01.2024", 403));
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
            accountnumber = $17
        WHERE id = $18
        RETURNING id`,
        [
            contractNumber,
            formattedContractDate,
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
            Math.round((forContract.allMoney * 100) / 100),
            Math.round((oneTimeMoney * 100) / 100),
            Math.round((forContract.money * 100) / 100),
            Math.round((forContract.discountMoney * 100) / 100),
            accountNumber,
            req.params.id
        ]
    );

    // Delete old tasks
    await pool.query(`DELETE FROM tasks WHERE contract_id = $1`, [req.params.id]);
    await pool.query(`DELETE FROM iib_tasks WHERE contract_id = $1`, [req.params.id]);

    for (let battalion of forBattalion) {
        let tableName = null
        const user = await pool.query(`SELECT status FROM users WHERE username = $1`, [battalion.name])
        if(user.rows[0].status){
            tableName = `iib_tasks`
        }else{
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
                address
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, 
            [
                contract.rows[0].id,
                contractNumber,
                clientName,
                formattedTaskDate,
                battalion.workerNumber,
                Math.round((battalion.oneTimeMoney * 100) / 100),
                battalion.taskTime,
                Math.round((battalion.allMoney * 100) / 100),
                Math.round((battalion.money * 100) / 100),
                Math.round((battalion.discountMoney * 100) / 100),
                battalion.name,
                address
            ]
        );
    }

    return res.status(201).json({
        success: true,
        data: "Yangilandi"
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
        ORDER BY contractnumber
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
            if (["81109", "81140", "84007", "89071", "98157", "98162", "Тошкент шаҳар МГ", "Toshkent Shahar IIBB"].includes(key)) {
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
        if (!data || !data.clientname || !data.contractnumber || !data.contractdate || !data.tasktime || !data.timelimit || !data.taskdate) {
            return next(new ErrorResponse("Sorovlar bosh qolishi mumkin emas excel fileni tekshiring", 400));
        }
    }
    
    let accountnumber = await pool.query(`SELECT accountnumber FROM accountnumber`);
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
    
        const bxm = await pool.query(`SELECT * FROM bxm`);
        const oneTimeMoney = Math.round((bxm.rows[0].summa * 0.07) * 100) / 100;
    
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
                accountnumber
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`, 
            [
                data.contractnumber, 
                contractDate, 
                data.clientname.trim(),  
                data.timelimit, 
                data.address ? data.address.trim() : null,  
                null,
                forContract.workerNumber,
                forContract.allMoney,
                oneTimeMoney,
                forContract.money,
                forContract.discountMoney,
                data.tasktime,
                returnDate(data.taskdate.toString().trim()),
                accountnumber
            ]
        );
    
        for (let battalion of forBattalion) {
            const user = await pool.query(`SELECT status FROM users WHERE username = $1`, [battalion.name]);
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
                    address
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, 
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
                    data.address ? data.address.trim() : null
                ]
            );
        }
    }
    
    return res.status(200).json({
        success: true,
        datas
    });
})

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
                if (["81109", "81140", "84007", "89071", "98157", "98162", "Тошкент шаҳар МГ", "Toshkent Shahar IIBB"].includes(key)) {
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

    
    let accountnumberResult = await pool.query(`SELECT accountnumber FROM accountnumber`);
    let accountnumber = accountnumberResult.rows[0].accountnumber;
    
    // For loop to process each data entry
    for (let data of datas) {
        const isNull = checkBattailonsIsNull(data.battalions);
        if (!isNull) {
            return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
        }
    
        const testIsSame = checkBattalionName(data.battalions);
        if (!testIsSame) {
            return next(new ErrorResponse("Bitta shartnomada bitta organ bir marta tanlanishi kerak", 400));
        }
        
        let contractDate = returnDate(data.contractdate.trim());
        let taskDate = returnDate(data.taskdate.trim());
        if (!contractDate || !taskDate) {
            return next(new ErrorResponse("Sana formatini to'g'ri kiriting: 'kun.oy.yil'. Masalan: 01.01.2024", 400));
        }
    
        const bxm = await pool.query(`SELECT * FROM bxm`);
        const oneTimeMoney = Math.round((bxm.rows[0].summa * 0.07) * 100) / 100;
    
        const forContract = returnWorkerNumberAndAllMoney(oneTimeMoney, data.battalions, null, data.tasktime);
        const forBattalion = returnBattalion(oneTimeMoney, data.battalions, null, data.tasktime);
    
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
                accountnumber
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
                returnDate(data.taskdate.toString().trim()),
                accountnumber
            ]
        );
    
        // For loop to insert battalion data
        for (let j = 0; j < forBattalion.length; j++) {
            const battalion = forBattalion[j];
            const userResult = await pool.query(`SELECT status FROM users WHERE username = $1`, [battalion.name]);
            let tableName = null;
            if (userResult.rows[0].status) {
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
                    address
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, 
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
                    data.address ? data.address.trim() : 'address'
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
    const {address, contractNumber, contractDate, clientName, clientAccount, clientAddress, clientMFO, clientSTR, treasuryAccount, timeLimit, accountNumber} = req.body
    
    if (!contractNumber || !contractDate || !clientName || !timeLimit || !address|| !accountNumber) {
        return next(new ErrorResponse("So'rovlar bo'sh qolishi mumkin emas", 403));
    }
    let date = returnDate(contractDate.toString().trim())
    const contract = await pool.query(`UPDATE contracts 
        SET contractnumber = $1, contractdate = $2, clientname= $3, timelimit = $4, clientaccount = $5, clientaddress = $6, clientmfo = $7, clientstr = $8, treasuryaccount = $9, accountnumber = $10, address = $11
        WHERE id = $12
        RETURNING *
        `, [
            contractNumber,
            date,
            clientName,
            timeLimit,
            clientAccount,
            clientAddress,
            clientMFO,
            clientSTR,
            treasuryAccount,
            accountNumber,
            address,
            req.params.id
    ])
    return res.status(200).json({
        success: true,
        data: contract.rows[0]
    })
})

// search contract by number 
exports.searchByNumber = asyncHandler(async (req, res, next) => {
    const {contractNumber} = req.body
    if(!contractNumber){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }
    
    const contract = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address FROM contracts WHERE contractnumber = $1`, [contractNumber])

    return res.status(200).json({
        success: true,
        data: contract.rows
    })
})

// search contract by client name  
exports.searchByClientName = asyncHandler(async (req, res, next) => {
    const {clientName} = req.body
    if(!clientName){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }
    
    const contract = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address FROM contracts WHERE clientname = $1`, [clientName.trim()])

    return res.status(200).json({
        success: true,
        data: contract.rows
    })
})

// search contract by address  
exports.searchByAddress = asyncHandler(async (req, res, next) => {
    const {address} = req.body
    if(!address){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }
    
    const contract = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address FROM contracts WHERE address = $1`, [address.trim()])

    return res.status(200).json({
        success: true,
        data: contract.rows
    })
})