const pool = require("../config/db");

module.exports = async () => {
    try {
        const test = await pool.query(`SELECT * FROM bxm`)
        if(!test.rows[0]){
            await pool.query(`INSERT INTO bxm(summa) VALUES($1)`, [340000])
            return;
        }
        return;
    } catch (error) {
        throw error
    }
}