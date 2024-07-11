const pool = require("../config/db");

module.exports = async () => {
    try {
        const IIB = await pool.query(`SELECT * FROM users WHERE username = $1`, ["Toshkent Shahar IIBB"])
        if(!IIB.rows[0]){
            await pool.query(`INSERT INTO users(username, password) VALUES($1, $2)`, ["Toshkent Shahar IIBB", '123'])
        }
        const B98162 = await pool.query(`SELECT * FROM users WHERE username = $1`, ["98162"])
        if(!B98162.rows[0]){
            await pool.query(`INSERT INTO users(username, password) VALUES($1, $2)`, ["98162", '123'])
        }
        const B98157 = await pool.query(`SELECT * FROM users WHERE username = $1`, ["98157"])
        if(!B98157.rows[0]){
            await pool.query(`INSERT INTO users(username, password) VALUES($1, $2)`, ["98157", '123'])
        }
        return;
    } catch (error) {
        throw error
    }
}