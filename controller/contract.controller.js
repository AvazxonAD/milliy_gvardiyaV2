const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const {
    returnDate
} = require('../utils/date.function')

const {
    checkBattailonsIsNull,
    returnWorkerNumberAndAllMoney,
    returnBattalion
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
            treasuryAccount, 
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
        await pool.query(`INSERT INTO tasks (
            user_id, 
            contract_id,
            contractnumber,
            clientname,
            taskDate,
            workernumber,
            timemoney,
            tasktime )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                battalionId.rows[0].id,
                contract.rows[0].id,
                contractNumber,
                clientName,
                taskDate,
                battalion.workerNumber,
                battalion.oneTimeMoney,
                battalion.taskTime
            ])
    }

    return res.status(201).json({
        success: true,
        data: contract.rows[0]
    })

})

// get all contracts 
exports.getAllcontracts = asyncHandler(async (req, res, next) => {
    const contracts = await pool.query(`SELECT id, contractnumber, contractdate, clientname, address FROM contracts`)
    
    return res.status(200).json({
        success: true,
        data: contracts.rows
    })
})

// get  contract and all tasks 
exports.getContractAndTasks = asyncHandler(async (req, res, next) => {
    const contract = await pool.query(`SELECT * FROM contracts WHERE contracts.id = $1
    `, [req.params.id])
    const tasks = await pool.query(`SELECT * FROM tasks WHERE contract_id = $1
        `, [req.params.id])
    
    return res.status(200).json({
        success: true,
        data: contract.rows[0],
        tasks: tasks.rows
    })
})