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
    checkDateWithNowDate
} = require('../utils/contract.functions');
const pool = require("../config/db");


exports.create = asyncHandler(async (req, res, next) => {
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
        discount
    } = req.body
    if(!contractNumber || !contractDate ||  !clientName || !timeLimit || !address || !taskDate || !taskTime){
        return next(new ErrorResponse("sorovlar bosh qolishi mukkin", 403))
    }   
    const isNull = checkBattailonsIsNull(battalions)
    if(!isNull){
        return next(new ErrorResponse("sorovlar bosh qolishi mukkin", 403))
    }

    contractDate = returnDate(contractDate)
    taskDate = returnDate(taskDate)
    if(!contractDate || !taskDate) {
        return next(new ErrorResponse("sana formatini togri kiriting 'kun.oy.yil'. Masalan : 01.01.2024"))
    }

    const bxm = await pool.query(`SELECT * FROM bxm`)
    const oneTimeMoney = Math.round(((bxm.rows[0].summa * 0.07) * 100) / 100)

    const forContract = returnWorkerNumberAndAllMoney(oneTimeMoney, battalions, discount, taskTime)
    const forBattalion = returnBattalion(oneTimeMoney, battalions, discount, taskTime)
    const contract = await pool.query(
        `INSERT INTO contracts (
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
            allworkernumber,
            allmoney,
            timemoney,
            money,
            discountmoney,
            tasktime,
            taskdate
            )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING * 
        `, [ 
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
            taskTime,
            taskDate
        ]
    );
    for(let battalion of forBattalion){
        const battalionId = await pool.query(`SELECT id FROM users WHERE username = $1`, [battalion.name])
        if(battalion.name === "Toshkent Shahar IIBB" || battalion.name === "98162" || battalion.name === "98157" ){
            await pool.query(`INSERT INTO iib_tasks (
                user_id, 
                contract_id,
                contractnumber,
                clientname,
                taskDate,
                workernumber,
                timemoney,
                tasktime,
                allmoney,
                money,
                discountmoney ,
                battalionname,
                address
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                    battalionId.rows[0].id,
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
                ])
        }else{
            await pool.query(`INSERT INTO tasks (
                user_id, 
                contract_id,
                contractnumber,
                clientname,
                taskDate,
                workernumber,
                timemoney,
                tasktime,
                allmoney,
                money,
                discountmoney ,
                battalionname,
                address
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                    battalionId.rows[0].id,
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
                ])
        }
        
    }

    return res.status(201).json({
        success: true,
        data: contract.rows[0]
    })

})

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
        discount
    } = req.body;
    
    if(!contractNumber || !contractDate ||  !clientName || !timeLimit || !address || !taskDate || !taskTime){
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
            contractNumber = $1, 
            contractDate = $2, 
            clientName = $3, 
            clientAddress = $4, 
            clientMFO = $5, 
            clientAccount = $6, 
            clientSTR = $7, 
            treasuryAccount = $8, 
            timeLimit = $9, 
            address = $10, 
            discount = $11,
            allworkernumber = $12,
            allmoney = $13,
            timemoney = $14,
            money = $15,
            discountmoney = $16
        WHERE id = $17
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
            req.params.id
        ]
    );

    await pool.query(`DELETE FROM tasks WHERE contract_id = $1`, [req.params.id]);
    await pool.query(`DELETE FROM iib_tasks WHERE contract_id = $1`, [req.params.id]);
    
    for(let battalion of forBattalion){
        const battalionId = await pool.query(`SELECT id FROM users WHERE username = $1`, [battalion.name]);
        if(battalion.name === "Toshkent Shahar IIBB" || battalion.name === "98162" || battalion.name === "98157"){
            await pool.query(`INSERT INTO iib_tasks (
                user_id, 
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
                battalionname
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                battalionId.rows[0].id,
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
                battalion.name
            ]);
        } else {
            await pool.query(`INSERT INTO tasks (
                user_id, 
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
                battalionname
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                battalionId.rows[0].id,
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
                battalion.name
            ]);
        }
    }

    return res.status(201).json({
        success: true,
        data: contract.rows[0]
    });
});

// get all contracts 
exports.getAllcontracts = asyncHandler(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 10 
    const page = parseInt(req.query.page) || 1

    let  contracts = await pool.query(`
        SELECT id, contractnumber, contractdate, clientname, address 
        FROM contracts OFFSET $1 LIMIT $2
        `, [(page - 1) * limit, limit ])
    let result  = contracts.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate)
        return contract  
    })
    
    const total = await pool.query(`SELECT COUNT(id) AS total FROM contracts `)

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

// get  contract and all tasks 
exports.getContractAndTasks = asyncHandler(async (req, res, next) => {
    let contract = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address, ispay, address FROM contracts WHERE contracts.id = $1
    `, [req.params.id])
    
    let resultContract  = contract.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate)
        return contract  
    })

    let  tasks = await pool.query(`SELECT id, taskdate, inprogress FROM tasks WHERE contract_id = $1
        `, [req.params.id])
    const test = blockTasks(tasks.rows)
    if(test.length >= 1){
        for(let task of test ){
            await pool.query(`UPDATE tasks SET inprogress = $1, done = $2, notdone = $3
                WHERE id = $4
                `, [false, false, true, task.id])
        }
    }
    let  resulttasks = await pool.query(`SELECT id, battalionname, taskdate, workernumber, inprogress, done, notdone  FROM tasks WHERE contract_id = $1
    `, [req.params.id])
    
    const iib_tasks = await pool.query(`SELECT id, battalionname,  workernumber FROM iib_tasks WHERE contract_id = $1`, [contract.rows[0].id])
    
    let result = resulttasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate)
            return task
    })

    for(let task of iib_tasks.rows){
        result.push(task)
    }

    return res.status(200).json({
        success: true,
        data: resultContract,
        tasks: result
    })
})

// to print 
exports.toPrint = asyncHandler(async (req, res, next) => {
    let tasksResult = []
    const contract = await pool.query(`SELECT * FROM contracts WHERE id = $1`, [req.params.id])
    let resultContract  = contract.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate)
        contract.taskdate = returnLocalDate(contract.taskdate) 
        return contract  
    })

    const tasks = await pool.query(`SELECT id, battalionname, workernumber, timemoney, tasktime, allmoney, money, discountmoney FROM tasks WHERE contract_id = $1`, [contract.rows[0].id])
    const iib_tasks = await pool.query(`SELECT id,  battalionname, workernumber, timemoney, tasktime, allmoney, money, discountmoney FROM iib_tasks WHERE contract_id = $1`, [contract.rows[0].id])
    
    for(let task of tasks.rows){
        tasksResult.push(task)
    }
    for(let task of iib_tasks.rows){
        tasksResult.push(task)
    }
    return res.status(200).json({
        success: true,
        data: resultContract,
        tasks: tasksResult
    })
})

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
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let {date1, date2} = req.body
    date1 = returnDate(date1)
    date2 = returnDate(date2)
    if(!date1 || !date2){
       return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    let  contracts = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address FROM contracts
        WHERE contractdate BETWEEN $1 AND $2`, [date1, date2])

    let result  = contracts.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate)
        return contract  
    })

    return res.status(200).json({
        success: true,
        data: result
    })
})

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

    const task = await pool.query(`UPDATE tasks SET taskdate = $1, inprogress = $2, done = $3, notdone = $4
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