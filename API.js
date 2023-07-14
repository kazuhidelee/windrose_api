import express from 'express';
import cors from 'cors';
import mysql from 'mysql';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.port || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// Connect to the database
const pool = mysql.createPool({
    user: 'root',
    password: 'mrapid123',
    database: 'MRAPID',
    socketPath: '/cloudsql/mrapid:us-central1:mrapid',
})


// Routes
// Home, test response
app.get("/", async (req, res) => {
    res.json({status: "Ready! :)"});
});

// For pollutant map, one feature for each sensor and most recent measurements for all pollutants
// Also returns some sensor information
app.get("/mapData", async (req, res) => {
    // TODO: when sensor_name is replaced by sensor ID in the db, update this func

    // SQL command to get most recent measurements for each parameter at every sensor location
    var query = "SELECT value, t.parameter, t.unit, t.time, t.sensor_name, latitude, longitude, source FROM MRAPID.measurements t ";
    query += "INNER JOIN MRAPID.sensors ON t.sensor_name = sensors.sensor_name ";

    var recents = "SELECT parameter, unit, MAX(time) latest_time, sensor_name FROM MRAPID.measurements ";
    recents += "WHERE unit='µg/m³' OR unit='ppm' OR unit='ppb' ";
    recents += "GROUP BY parameter , sensor_name , unit";
    query += "JOIN ( " + recents + " ) recents ";

    query += "ON t.sensor_name = recents.sensor_name AND t.time = recents.latest_time AND t.parameter = recents.parameter ";
    query += "WHERE	t.unit='µg/m³' OR t.unit='ppm' OR t.unit='ppb'";

    /* SQL query nicely formatted
        SELECT value, t.parameter, t.unit, t.time, t.sensor_name, latitude, longitude, source
        FROM measurements t
        INNER JOIN
            sensors 
        ON t.sensor_name = sensors.sensor_name
        JOIN (
            SELECT 
                parameter, unit, MAX(time) latest_time, sensor_name
            FROM measurements
            WHERE		unit='µg/m³' OR unit='ppm' OR unit='ppb'
            GROUP BY parameter , sensor_name , unit
            ) recents
        ON t.sensor_name = recents.sensor_name
        AND t.time = recents.latest_time
        AND t.parameter = recents.parameter
        WHERE		t.unit='µg/m³' OR t.unit='ppm' OR t.unit='ppb'
    */

    try{
        pool.query(query, [], (error, results) => {
            if(!results[0]){ // No results
                res.json({ status: "Not found" });
            } else{
                // Return measurements in a Feature Collection
                var geojson = {};
                geojson['type'] = 'FeatureCollection';
                geojson['features'] = [];

                /* Feature format:
                 {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [longitude, latitude]
                    },
                    "properties": {
                        [param1 name]: {
                            "value": ___,
                            "unit": ___
                        },
                        [param2 name]: {
                            "value": ___,
                            "unit": ___
                        },
                        "info": {
                            "sensorID": ____,
                            "source": OPENAQ/CLARITY/DST/TSI
                        }
                    }
                 }
                 */

                var lat = Number(results[0].latitude);
                var long = Number(results[0].longitude);
                var lat_rounded = lat.toFixed(4);
                var long_rounded = long.toFixed(4);

                var sensorFeature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [long_rounded, lat_rounded]
                    },
                    "properties": {}
                };

                var curr_sensor_name = results[0].sensor_name;
                var prev_sensor_name = results[0].sensor_name;

                for (var i = 0; i < results.length; ++i) {
                    curr_sensor_name = results[i].sensor_name;

                    if(curr_sensor_name != prev_sensor_name){ // reached a new sensor
                        // close out the old feature
                        var prev;
                        if(i == 0) prev = 0;
                        else prev = i - 1;
                        sensorFeature['properties']['info'] = {
                            "sensorID": results[prev].sensor_name,
                            "source": results[prev].source
                        };

                        geojson['features'].push(sensorFeature);

                        // start a new feature. need new var to prevent reference to same obj
                        var newFeature = {
                            "type": "Feature",
                            "geometry": {
                                "type": "Point",
                                "coordinates": []
                            },
                            "properties": {}
                        };
                        sensorFeature = newFeature;

                        // round latitude and longitude coordinates to 4 decimal places
                        var lat = Number(results[i].latitude);
                        var long = Number(results[i].longitude);
                        var lat_rounded = lat.toFixed(4);
                        var long_rounded = long.toFixed(4);
                        sensorFeature['geometry']['coordinates'] = [long_rounded, lat_rounded];
                    } 

                    // add the parameter, measurement, and unit
                    var param = results[i].parameter;
                    sensorFeature['properties'][param] = {
                        "value": Number(results[i].value).toFixed(0), // round measurements to whole number
                        "unit": results[i].unit
                    };

                    prev_sensor_name = curr_sensor_name;
                }

                // close out last feature
                sensorFeature['properties']['info'] = {
                    "sensorID": results[results.length - 1].sensor_name,
                    "source": results[results.length - 1].source
                };
                geojson['features'].push(sensorFeature);

                res.status(200).json(geojson);
            }
        });
    } catch(error){
        console.error('Error querying the database: ', error);
        res.status(500).json({message: 'Error querying the database'});
    }
});

// For each monitor, get most recent value of a specific pollutant
// Request link format is "[server]/latest[pollutant]". ex: http://localhost:8080/latestpm2.5
app.get("/latest:pollutant", async (req, res) => {
    // Define measurement unit based on requested pollutant
    var unit = "";
    if(req.params.pollutant == "pm1" || req.params.pollutant == "pm2.5" || req.params.pollutant == "pm10") unit = "µg/m³";
    else unit = "ppm";
    
    // SQL command to get most recent measurements for a specific parameter
    var query = "SELECT value, parameter, unit, time, latitude, longitude FROM MRAPID.measurements t ";
    const join_lat_long = "INNER JOIN MRAPID.sensors ON t.sensor_name = MRAPID.sensors.sensor_name ";
    query += join_lat_long;

    const recents = "SELECT sensor_name, MAX(time) latest_time FROM MRAPID.measurements WHERE parameter = ? AND unit = '" + unit + "' GROUP BY sensor_name ";
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
                    //var param = results[i].parameter;

                    // round latitude and longitude coordinates to 4 decimal places
                    var lat = Number(results[i].latitude);
                    var long = Number(results[i].longitude);
                    var lat_rounded = lat.toFixed(4);
                    var long_rounded = long.toFixed(4);

                    // round measurements to whole number
                    var value = Number(results[i].value).toFixed(0);

                    var newFeature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [long_rounded, lat_rounded]
                        },
                        "properties": {
                            "param": value
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


/*
TODO:: ADD HUMAN FRIENDLY LOCATION INFO WHEN IT'S AVAILABLE ie not long-lat, maybe zip code or county? or x miles from address (maybe see if it's possible figure out how to calculate long/lat given address--there's probably a library somewhere??)
ALSO, include: time to time?? parameters
    Returns data on a single pollutant in the last specified timeframe (hour, day, week, month, year) in chronological order
    Default is all pollutants, day
    meant for users/ presenting data as table, not for map; does not return in geojson format
    Request link format is "[server]/data?pollutant=[pollutant]&timeframe=[timeframe]".
    ex: http://localhost:3306/data?pollutant=pm2.5&timeframe=day
    Return format: (excerpt of pm2.5 data)
        {
            "pm2.5": { "unit":"particles/cm³",
                       "data":[
                            {"time":"2023-06-28T08:00:00.000Z","measurement":"138.5","sensor":"OAQ : ELIZA HOWELL-NR"},
                            {"time":"2023-06-28T08:00:00.000Z","measurement":"170.2","sensor":"OAQ : NEW HAVEN"},
                            {"time":"2023-06-28T08:00:00.000Z","measurement":"206.5","sensor":"OAQ : DEARBORN"}
                        ]
                      }
        }
    ex multiple but not all pollutant params selected: http://localhost:3306/data?pollutant=pm2.5&pollutant=CO&timeframe=day
*/
app.get("/data", async (req, res) => {
    let date = new Date();
    if (req.query.timeframe == "hour") {
        date.setHours(date.getHours() - 1);
    } else if (req.query.timeframe == "year") {
        date.setFullYear(date.getFullYear()-1);
    } else if (req.query.timeframe == "week") {
        date.setDate(date.getDate() - 7);
    } else if (req.query.timeframe == "month") {
        date.setMonth(date.getMonth()-1);
    } else {
        // day, default timeframe
        date.setDate(date.getDate() - 1);
    } 
    date = date.toISOString();
    console.log("pollutants");
    console.log(req.query.pollutant);
    var query;
    var params = [];
    if (!req.query.pollutant) {
        query = "SELECT * FROM MRAPID.measurements WHERE (time > ?) ORDER BY parameter, time";
        params = [date];
    } else {
        if (req.query.pollutant.length == 1) {
            query = "SELECT * FROM MRAPID.measurements WHERE (parameter = ? AND time > ?) ORDER BY time";
            params.push(req.query.pollutant);
        } else {
            query = "SELECT * FROM MRAPID.measurements WHERE ((";
            req.query.pollutant.forEach(element => {
                query += "(parameter = ?) || "
                params.push(element);
            });
            query += "0) AND time > ?) ORDER BY parameter,time";
        }
        params.push(date);
    }
    console.log(query);
    try{
        pool.query(query, params, (error, results) => {
            console.log("results");
            console.log(results);
            //res.status(200).json({"results": date});
            if(!results[0]){ // No results
                res.json({ status: "No results" });
            } else{
                var output = {};
                var data = [];
                var current_parameter = results[0].parameter;
                for (var i = 0; i < results.length; i++) {
                    if (results[i].parameter == current_parameter) {
                        var newFeature = {
                            "time": results[i].time,
                            "measurement": results[i].value,
                            "sensor": results[i].sensor_name,
                        }
                        data.push(newFeature);
                    } else {
                        current_parameter = results[i].parameter;
                        output[results[i-1].parameter] = {
                            'unit': results[i-1].unit,
                            'data': data,
                        };
                        data = [];
                        i--;
                    }
                }
                output[results[results.length - 1].parameter] = {
                    'unit': results[results.length - 1].unit,
                    'data': data,
                };
                res.status(200).json(output);

            }
        });
    } catch(error){
        console.error('Error querying the database: ', error);
        res.status(500).json({message: 'Error querying the database'});
    }
});
