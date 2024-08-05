const pool = require("../config/db")

module.exports = async () => {
    try {
        const admin = await pool.query(`SELECT id FROM users WHERE adminstatus = $1`, [true])
        const id = admin.rows[0].id
        const bxm = await pool.query(`SELECT * FROM bxm`)
        if (!bxm.rows[0]) {
            await pool.query(`INSERT INTO bxm(summa) VALUES($1)`, [340000])
            return
        }

        const accountnumber = await pool.query(`SELECT * FROM accountnumber`)
        if (!accountnumber.rows[0]) {
            await pool.query(`INSERT INTO accountnumber(accountnumber, user_id) VALUES($1, $2)`, ['21 506 000 705 131 158 003', id])
            return
        }

        const address = await pool.query(`SELECT * FROM addresses`)
        if (!address.rows[0]) {
            await pool.query(`INSERT INTO addresses(address, user_id) VALUES($1, $2)`, ['Тошкент шаҳри, Шайхонтохур тумани, Навоий кўчаси, 17А-уй.', id])
            return
        }

        const bank = await pool.query(`SELECT * FROM banks`)
        if (!bank.rows[0]) {
            await pool.query(`INSERT INTO banks(bank, user_id) VALUES($1, $2)`, ["Марказий банк Тошкент ш. ХККМ.", id])
            return
        }

        const executor = await pool.query(`SELECT * FROM executors`)
        if (!executor.rows[0]) {
            await pool.query(`INSERT INTO executors(executor, user_id) VALUES($1, $2)`, ["Тошкент шаҳар", id])
            return
        }

        const leader = await pool.query(`SELECT * FROM leaders`)
        if (!leader.rows[0]) {
            await pool.query(`INSERT INTO leaders(leader, user_id) VALUES($1, $2)`, ["А.Р. Ортиков", id])
            return
        }

        const mfo = await pool.query(`SELECT * FROM mfos`)
        if (!mfo.rows[0]) {
            await pool.query(`INSERT INTO mfos(mfo, user_id) VALUES($1, $2)`, ['00014', id])
            return
        }

        const str = await pool.query(`SELECT * FROM strs`)
        if (!str.rows[0]) {
            await pool.query(`INSERT INTO strs(str, user_id) VALUES($1, $2)`, ['207305369', id])
            return
        }
    } catch (error) {
        console.log(error)
    }
}