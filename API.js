import express from 'express';
import cors from 'cors';
import mysql from 'mysql';
import mssql from 'mssql'; // MS Sql Server client
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database connection parameters
var config = {
    user: 'admin',
    server: 'mrapid-db-instance.csicgkuu36em.us-east-1.rds.amazonaws.com',
    password: 'mrapid123',
    database: 'MRAPID'
}

// Connect to database
// Current issue: connection error here with mssql, works with mysql.createConnection but then would have
// to change the routes section to use mysql instead of mssql. Currently looking into that
mssql.connect(config, err => {
    if(err) {
        console.error('Error connecting to the database: ', err);
        process.exit(1);
    }
});

// Routes
app.get('/measurements', async (req, res) => {
    try {
        const request = new mssql.Request();
        const result = await request.query('SELECT * FROM measurements');
        res.status(200).json(result.recordset);

    } catch(error) {
        console.error('Error querying the database: ', error);
        res.status(500).json({message: 'Error querying the database'});
    }
})

const PORT = 3306;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});