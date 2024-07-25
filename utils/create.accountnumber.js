const pool = require("../config/db");

module.exports = async () => {
    const accountnumber = await pool.query(`SELECT * FROM accountnumber`)
    if(!accountnumber.rows[0]){
        await pool.query(`INSERT INTO accountnumber(accountnumber) VALUES($1)`, ['21 506 000 705 131 158 003'])
        return;
    }
    return;
}