const asyncHandler = require("../middleware/asyncHandler");
const pool = require('../config/db')

module.exports = asyncHandler(async () => {
    const test = await pool.query(`SELECT * FROM users WHERE adminStatus = $1`, [true])
    if(test.rows.length < 1){
        await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
            `, ["Respublika", true, "123"])
        return
    }
    return
})
