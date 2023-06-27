import express from 'express';
import cors from 'cors';
import mysql from 'mysql';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.port || 3306;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// Database connection parameters
var config = {
    user: 'admin',
    host: 'mrapid-db-instance.csicgkuu36em.us-east-1.rds.amazonaws.com',
    password: 'mrapid123',
    database: 'MRAPID'
}

// Connect to database
mysql.createConnection(config, err => {
    if(err) {
        console.error('Error connecting to the database: ', err);
        process.exit(1);
    }
});

// Routes
app.get("/", async (req, res) => {
    res.json({status: "Ready! :)"});
});

// TODO: search by var_desired. fill in var_desired and dbCol
// Note: can use postman to test GET requests
app.get("/:var_desired", async (req, res) => {
    const query = "SELECT * FROM measurements WHERE dbCol = ?";
    pool.query(query, [ req.params.variable_name ], (error, results) => {
        if(!results[0]){ // No results
            res.json({ status: "Not found" });
        } else{
            res.json(results[0]);
        }
    });
});

const pool = mysql.createPool({
    user: 'admin',
    password: 'mrapid123',
    database: 'MRAPID',
    socketPath: 'mrapid-db-instance.csicgkuu36em.us-east-1.rds.amazonaws.com' // wtf is this
})

/*
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
*/