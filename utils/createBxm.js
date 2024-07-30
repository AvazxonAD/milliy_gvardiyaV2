const pool = require("../config/db")

module.exports = async () => {
    const bxm = await pool.query(`SELECT * FROM bxm`)
    if(!bxm.rows[0]){
        await pool.query(`INSERT INTO bxm(summa) VALUES($1)`, [340000])
        return
    }
    return
}