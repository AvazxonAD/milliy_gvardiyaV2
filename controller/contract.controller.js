const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const {
    returnDate,
    returnStringDate
} = require('../utils/date.function')

const {
    checkBattailonsIsNull,
    returnWorkerNumberAndAllMoney,
    returnBattalion,
    blockTasks
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
            discountmoney
            )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING * 
        `, [ 
            contractNumber, 
            contractDate, 
            clientName, 
            clientAddress, 
            clientMFO, 
            clientAccount, 
            clientSTR, 
            parseInt(treasuryAccount), 
            timeLimit, 
            address,  
            discount,
            forContract.workerNumber,
            forContract.allMoney,
            oneTimeMoney,
            forContract.money,
            forContract.discountMoney
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
                ])
        }
        
    }

    return res.status(201).json({
        success: true,
        data: contract.rows[0]
    })

})



// get all contracts 
exports.getAllcontracts = asyncHandler(async (req, res, next) => {
    let  contracts = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address FROM contracts`)
    let result  = contracts.rows.map(contract => {
        contract.contractdate = returnStringDate(contract.contractdate)
        return contract  
    })
    
    return res.status(200).json({
        success: true,
        data: result
    })
})

// get  contract and all tasks 
exports.getContractAndTasks = asyncHandler(async (req, res, next) => {
    let contract = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address FROM contracts WHERE contracts.id = $1
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
    
    
    let result = resulttasks.rows.map(task => {
            task.taskdate = returnStringDate(task.taskdate)
            return task
    })
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


// payment contract 
exports.paymentContract = asyncHandler(async (req, res, next) => {
    const contract = await pool.query(`UPDATE contracts SET ispay = $1 WHERE id = $2 RETURNING id`, [true, req.params.id])
    const tasks = await pool.query(`SELECT done FROM tasks WHERE contract_id = $1`, [contract.rows[0].id])
    
    for(let task of tasks.rows ){
        if(!task.done){
            return next(new ErrorResponse("ushbu shartnoma uchun hali xodim biriktrilmadi", 403))
        }
    }

    await pool.query(`UPDATE worker_tasks SET ispay = $1 WHERE contract_id = $2`, [true, contract.rows[0].id])
    await pool.query(`UPDATE iib_tasks SET ispay = $1, WHERE contract_id = $2`, true, contract.rows[0].id)
    return res.status(200).json({
        success: true,
        data: "Muvaffiqiyatli amalga oshirildi"
    })
})
