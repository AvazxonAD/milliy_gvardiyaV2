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
        const Buxoro  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Buxoro'])
        if(Buxoro.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Buxoro", true, "123"])
        }
        const Jizzax  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Jizzax'])
        if(Jizzax.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Jizzax", true, "123"])
        }
        const Xorazm  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Xorazm'])
        if(Xorazm.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Xorazm", true, "123"])
        }
        const Namangan  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Namangan'])
        if(Namangan.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Namangan", true, "123"])
        }
        const Navoiy  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Navoiy'])
        if(Navoiy.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Navoiy", true, "123"])
        }
        const Qashqadaryo  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Qashqadaryo'])
        if(Qashqadaryo.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Qashqadaryo", true, "123"])
        }
        const Q_R_Respublikasi  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Q_R_Respublikasi'])
        if(Q_R_Respublikasi.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Q_R_Respublikasi", true, "123"])
        }
        const Samarqand  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Samarqand'])
        if(Samarqand.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Samarqand", true, "123"])
        }
        const Sirdaryo  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Sirdaryo'])
        if(Sirdaryo.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Sirdaryo", true, "123"])
        }
        const Surxondaryo  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Surxondaryo'])
        if(Surxondaryo.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Surxondaryo", true, "123"])
        }
        const Toshkent_sh  = await pool.query(`SELECT * FROM users WHERE adminStatus = $1 AND username = $2`, [true, 'Toshkent_sh'])
        if(Toshkent_sh.rows.length < 1){
            await pool.query(`INSERT INTO users(username, adminStatus, password) VALUES ($1, $2, $3)
                `, ["Toshkent_sh", true, "123"])
        }
        return
    } catch (error) {
        throw error
    }
}
