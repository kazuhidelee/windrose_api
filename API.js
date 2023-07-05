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

const pool = mysql.createPool({
    user: 'admin',
    host: 'mrapid-db-instance.csicgkuu36em.us-east-1.rds.amazonaws.com',
    password: 'mrapid123',
    database: 'MRAPID'
})

// Routes
// Home, test response
app.get("/", async (req, res) => {
    res.json({status: "Ready! :)"});
});

// For each monitor, get most recent value of a specific pollutant
app.get("/:pollutant", async (req, res) => {
    // Define measurement unit based on requested pollutant
    const unit = "";
    if(req.params.pollutant == "pm1" || req.params.pollutant == "pm2.5" || req.params.pollutant == "pm10") unit = "µg/m³";
    else unit = "ppm";

    // SQL command to get most recent measurements for a specific parameter
    var query = "SELECT value, parameter, unit, time, latitude, longitude FROM measurements t ";
    const join_lat_long = "INNER JOIN sensors ON t.sensor_name = sensors.sensor_name ";
    query += join_lat_long;

    const recents = "SELECT sensor_name, MAX(time) latest_time FROM measurements WHERE parameter = ? AND unit = '" + unit + "' GROUP BY sensor_name ";
    query += "JOIN ( " + recents + " ) recents ";

    query += "ON t.sensor_name = recents.sensor_name AND t.time = recents.latest_time ";
    query = query + "WHERE t.parameter = ? AND unit = '" + unit + "'";
    
    /* SQL query nicely formatted, example using PM 2.5
        SELECT 
            value, parameter, unit, time, latitude, longitude
        FROM
            measurements t
                INNER JOIN
            sensors ON t.sensor_name = sensors.sensor_name
                JOIN
            (SELECT 
                sensor_name, MAX(time) latest_time
            FROM
                measurements
            WHERE
                parameter = 'pm2.5' AND unit = 'µg/m³'
            GROUP BY sensor_name) recents ON t.sensor_name = recents.sensor_name
                AND t.time = recents.latest_time
        WHERE
            t.parameter = 'pm2.5' AND unit = 'µg/m³'
    */

    try{
        pool.query(query, [ req.params.pollutant, req.params.pollutant ], (error, results) => {
            if(!results[0]){ // No results
                res.json({ status: "Not found" });
            } else{
                // Return measurements in a Feature Collection
                var geojson = {};
                geojson['type'] = 'FeatureCollection';
                geojson['features'] = [];
                
                for (var i = 0; i < results.length; ++i) {
                    var param = results[i].parameter;
                    var newFeature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [results[i].latitude, results[i].longitude]
                        },
                        "properties": {
                            param: results[i].value
                        }
                    }
                    geojson['features'].push(newFeature);
                }

                res.status(200).json(geojson);
            }
        });
    } catch(error){
        console.error('Error querying the database: ', error);
        res.status(500).json({message: 'Error querying the database'});
    }
});