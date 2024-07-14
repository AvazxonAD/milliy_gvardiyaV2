const pool = require('../config/db')
const asyncHandler = require("../middleware/asyncHandler");
const ErrorResponse = require('../utils/errorResponse');

const {
    returnDate
} = require('../utils/date.function');

// get for result page  workers 
exports.getForResultPageWorkers = asyncHandler(async (req, res, next) => {
    if(!req.user.adminstatus){
        return next(new ErrorResponse("siz admin emassiz", 403))
    }

    let {date1, date2} = req.body
    if(!date1 || !date2){
        return next(new ErrorResponse("sorovlar bosh qolishi mumkin emas", 400))
    }

    date1 = returnDate(date1)
    date2 = returnDate(date2)
    if(!date1 || !date2){
       return next(new ErrorResponse("sana formati notog'ri kiritilgan tog'ri format : kun.oy.yil . Masalan: 12.12.2024", 400))
    }

    const batalyons = await pool.query(`SELECT username, id  FROM users WHERE adminstatus = $1 AND username NOT IN ($2, $3, $4)
    `, [false,"Toshkent Shahar IIBB", "98162", "98157"])
    console.log(batalyons.rows)
    for(let batalyon of batalyons.rows){
        const workers = await pool.query(`SELECT * FROM worker_tasks WHERE `)
    }
})