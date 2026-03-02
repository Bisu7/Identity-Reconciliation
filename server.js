const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.json());

const identifyRoute = require('./routes/identify');
app.use('./identify',identifyRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running port ${PORT}`);
})

const pool = require('./db');

async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Contact (
      id SERIAL PRIMARY KEY,
      phoneNumber VARCHAR(20),
      email VARCHAR(255),
      linkedId INTEGER,
      linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary', 'secondary')),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deletedAt TIMESTAMP
    );
  `);
}

createTable();