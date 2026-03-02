const {Pool} = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASEURL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;