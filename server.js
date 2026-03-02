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