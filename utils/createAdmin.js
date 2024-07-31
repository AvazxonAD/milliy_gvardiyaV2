const pool = require('../config/db')

module.exports = async () => {
    try {
        const Toshkent  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Toshkent'])
        if(Toshkent.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Toshkent", true, "123"])
        }
        const Andijon  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Andijon'])
        if(Andijon.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Andijon", true, "123"])
        }
        return
    } catch (error) {
        throw error
    }
}
