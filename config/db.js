const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost', 
  user: "postgres",
  port: 5432,
  database: "milliy_gvardiya",
  password: '1101jamshid'
});
module.exports = pool;
