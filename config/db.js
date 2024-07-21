const Pool = require('pg').Pool

const pool = new Pool({
    database: 'milliy_gvardiya',
    user: 'postgres',
    password: '1101jamshid',
    port: 5432,
})

module.exports = pool