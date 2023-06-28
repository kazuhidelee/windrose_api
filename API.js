import express from 'express';
import cors from 'cors';
import mysql from 'mysql';
// import Feature, FeatureCollection from 'geoscript/feature';
// import Point from 'geoscript/geom';

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

const pool = mysql.createPool({
    user: 'admin',
    password: 'mrapid123',
    database: 'MRAPID',
    socketPath: 'mrapid-db-instance.csicgkuu36em.us-east-1.rds.amazonaws.com' // wtf is this
})

// Routes
// Test response
app.get("/", async (req, res) => {
    res.json({status: "Ready! :)"});
});

// For each monitor, get most recent value of a specific pollutant
app.get("/:pollutant", async (req, res) => {
    // TODO: test this most recent func
    const recents = "SELECT lati, MAX(time) latest_time FROM measurements WHERE parameter = ? GROUP BY lati";
    const query = "SELECT t.* FROM measurements t ";
    query += "JOIN ( " + recents + " ) recents ";
    query += "ON t.lati = recents.lati AND t.time = recents.latest_time WHERE t.parameter = ?";
    
    /* SQL query for getting most recent measurements for a specific parameter (ex: PM 2.5)
        SELECT      t.*
        FROM       	measurements t
        JOIN        (
            SELECT      lati,
                        MAX(time) latest_time
            FROM        measurements
            WHERE		parameter = 'pm25'
            GROUP BY    lati
                    ) recents
        ON          t.lati = recents.lati
        AND         t.time = recents.latest_time
        WHERE		t.parameter = 'pm25'
    */

    try{
        pool.query(query, [ req.params.pollutant, req.params.pollutant ], (error, results) => {
            if(!results[0]){ // No results
                res.json({ status: "Not found" });
            } else{
                // TODO: get results into the feature collection format
                var collection = FeatureCollection({
                    features: function() {
                        for (var i = 0; i < 5; ++i) {
                            yield Feature({
                                geometry: Point([results[i].lati, results[i].longi]),
                                properties: {
                                    pollutant: 'value',
                                }
                            });
                        }
                    }
                });
    
                res.status(200).json(collection);
            }
        });
    } catch(error){
        console.error('Error querying the database: ', error);
        res.status(500).json({message: 'Error querying the database'});
    }
});