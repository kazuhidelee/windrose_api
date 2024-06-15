import express from "express";
import cors from "cors";
import mysql from "mysql";
import NodeCache from "node-cache";
import { kriging } from "./kriging.js";

const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.port || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// Connect to the database
const pool = mysql.createPool({
  user: "root",
  password: "mrapid123",
  database: "MRAPID",
  //connect to 34.171.19.205
  //host: "34.171.19.205",
  socketPath: "/cloudsql/mrapid:us-central1:mrapid",
});
//make sure connection successful
pool.getConnection((err, connection) => {
  if (err) {
    if (connection) connection.release();
    console.error("Error connecting to the database: ", err);
  } else {
    console.log("Connected to the database.");
  }
});

// Routes
// Home, test response
app.get("/", async (req, res) => {
  res.json({ status: "Ready! :)" });
});

// Returns a list of all the parameters we have measurements for in units of µg/m³, ppm, or ppb
app.get("/parameterList", async (req, res) => {
  const cacheKey = "parameterList";

  // Check if data is in cache
  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    // Return cached data
    res.status(200).json(cachedData);
    return;
  }

  const query =
    "SELECT DISTINCT parameter, unit FROM MRAPID.recent_measurements WHERE unit='µg/m³' OR unit='ppm' OR unit='ppb' OR unit='particles/cm³' ORDER BY parameter";

  // create map for parameters and display names
  var displayNames = new Map([
    ["pm0.5", "PM 0.5"],
    ["pm1", "PM 1"],
    ["pm2.5", "PM 2.5"],
    ["pm4", "PM 4"],
    ["pm10", "PM 10"],
    ["Black C", "Black Carbon"],
    ["SO2", "SO₂"],
    ["O3", "O₃"],
    ["NO2", "NO₂"],
    ["CO2", "CO₂"],
  ]);

  try {
    pool.query(query, [], (error, results) => {
      if (!results)
        res.status(500).json({ message: "Error querying the database" });
      else if (!results[0]) {
        // No results
        res.json({ status: "Not found" });
      } else {
        // Return measurements in a Feature Collection
        var allParams = {};
        allParams["results"] = [];

        for (var i = 0; i < results.length; ++i) {
          var displayName;
          if (displayNames.has(results[i].parameter))
            displayName = displayNames.get(results[i].parameter);
          else displayName = results[i].parameter;

          var param = {
            id: i + 1,
            name: results[i].parameter,
            units: results[i].unit,
            displayName: displayName,
          };

          allParams["results"].push(param);
        }
        //change allParams so that the element with "name": "pm2.5",
        //"units": "µg/m³", is first
        var pm25 = allParams["results"].find(
          (element) => element.name === "pm2.5"
        );
        allParams["results"] = allParams["results"].filter(
          (element) => element.name !== "pm2.5"
        );
        allParams["results"].unshift(pm25);
        //reset the id of each element
        allParams["results"].forEach((element, index) => {
          element.id = index + 1;
        });

        // Store result in cache
        myCache.set(cacheKey, allParams);

        res.status(200).json(allParams);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

//gets all unique zipcodes in the database
// ex: http://localhost:8080/zipcodes
app.get("/zipcodes", async (req, res) => {
  const query = "SELECT DISTINCT zip_code FROM MRAPID.sensors";

  try {
    pool.query(query, [], (error, results) => {
      if (!results[0]) {
        // No results
        res.json({ status: "Not found" });
      } else {
        // Return relevant zipcodes
        var zip_codes = [];
        for (var i = 0; i < results.length; ++i) {
          if (results[i].zip_code == "N/A") {
            continue;
          } //Some zips are N/A beacuse Not a single reverse Geocoding API I used could find them, I didnt input them in manually but they wont show up here
          var newZip = {
            zip_code: results[i].zip_code,
          };
          zip_codes.push(newZip);
        }
        var output = { zipcode_list: zip_codes };
        res.status(200).json(output);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

// For pollutant map, one feature for each sensor and most recent measurements for all pollutants
// Also returns some sensor information
app.get("/mapData", async (req, res) => {
  const key = "mapData";
  const value = myCache.get(key);

  if (value != undefined) {
    // Data is in cache, return it
    res.status(200).json(value);
    return;
  }

  // SQL command to get most recent measurements for each parameter at every sensor location
  // SQL command to get most recent measurements for each parameter at every sensor location
  var query = `
SELECT value, t.parameter, t.unit, t.time, t.sensor_id, sensor_name, latitude, longitude, source 
FROM MRAPID.recent_measurements t
INNER JOIN MRAPID.sensors ON t.sensor_id = sensors.sensor_id
WHERE (t.unit='µg/m³' OR t.unit='ppm' OR t.unit='ppb' OR t.unit='particles/cm³')
AND DATE(CONVERT_TZ(t.time, 'UTC', 'America/New_York')) = DATE(CONVERT_TZ(NOW(), 'UTC', 'America/New_York'))
`;

  /* SQL query nicely formatted
        SELECT value, t.parameter, t.unit, t.time, t.sensor_id, sensor_name, latitude, longitude, source
        FROM measurements t
        INNER JOIN
            sensors 
        ON t.sensor_id = sensors.sensor_id
        JOIN (
            SELECT 
                parameter, unit, MAX(time) latest_time, sensor_id
            FROM measurements
            WHERE		unit='µg/m³' OR unit='ppm' OR unit='ppb' OR unit='particles/cm³'
            GROUP BY parameter , sensor_id , unit
            ) recents
        ON t.sensor_id = recents.sensor_id
        AND t.time = recents.latest_time
        AND t.parameter = recents.parameter
        WHERE		t.unit='µg/m³' OR t.unit='ppm' OR t.unit='ppb' OR t.unit='particles/cm³'
    */

  try {
    pool.query(query, [], (error, results) => {
      if (!results[0]) {
        // No results
        res.json({ status: "Not found" });
      } else {
        // Return measurements in a Feature Collection
        var geojson = {};
        geojson["type"] = "FeatureCollection";
        geojson["features"] = [];

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
                            "sensorName": ____,
                            "source": OPENAQ/PURPLEAIR/CLARITY/DST/TSI
                        }
                    }
                 }
                 */

        var lat = Number(results[0].latitude);
        var long = Number(results[0].longitude);
        var lat_rounded = lat.toFixed(4);
        var long_rounded = long.toFixed(4);

        var sensorFeature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [long_rounded, lat_rounded],
          },
          properties: {},
        };

        var curr_sensor_id = results[0].sensor_id;
        var prev_sensor_id = results[0].sensor_id;

        for (var i = 0; i < results.length; ++i) {
          curr_sensor_id = results[i].sensor_id;

          if (curr_sensor_id != prev_sensor_id) {
            // reached a new sensor
            // close out the old feature
            var prev;
            if (i == 0) prev = 0;
            else prev = i - 1;
            sensorFeature["properties"]["info"] = {
              sensorID: results[prev].sensor_id,
              sensorName: results[prev].sensor_name,
              source: results[prev].source,
            };

            geojson["features"].push(sensorFeature);

            // start a new feature. need new var to prevent reference to same obj
            var newFeature = {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [],
              },
              properties: {},
            };
            sensorFeature = newFeature;

            // round latitude and longitude coordinates to 4 decimal places
            var lat = Number(results[i].latitude);
            var long = Number(results[i].longitude);
            var lat_rounded = lat.toFixed(4);
            var long_rounded = long.toFixed(4);
            sensorFeature["geometry"]["coordinates"] = [
              long_rounded,
              lat_rounded,
            ];
          }

          // add the parameter, measurement, and unit
          var param = results[i].parameter;
          var value_rounded;
          if (param == "Black C")
            value_rounded = Number(results[i].value).toFixed(1);
          // black carbon 1 decimal
          else value_rounded = Number(results[i].value).toFixed(0); // everything else whole number

          sensorFeature["properties"][param] = {
            value: value_rounded,
            unit: results[i].unit,
          };

          prev_sensor_id = curr_sensor_id;
        }

        // close out last feature
        sensorFeature["properties"]["info"] = {
          sensorID: results[results.length - 1].sensor_id,
          sensorName: results[results.length - 1].sensor_name,
          source: results[results.length - 1].source,
        };
        geojson["features"].push(sensorFeature);

        myCache.set(key, geojson);
        res.status(200).json(geojson);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

// Same as /mapData but gets most recent calculated AQI instead of recent measurments
// For pollutant map, one feature for each sensor and most recent calculared AQIs for all pollutants
// Also returns some sensor information
app.get("/mapAQIData", async (req, res) => {
  const key = "mapAQIData";
  const value = myCache.get(key);

  if (value != undefined) {
    // Data is in cache, return it
    res.status(200).json(value);
    return;
  }

  // SQL command to get most recent measurements for each parameter at every sensor location
  var query =
    "SELECT value, t.parameter, t.unit, t.time, t.sensor_id, sensor_name, latitude, longitude, source FROM MRAPID.AQI t ";
  query += "INNER JOIN MRAPID.sensors ON t.sensor_id = sensors.sensor_id ";

  var recents =
    "SELECT parameter, unit, MAX(time) latest_time, sensor_id FROM MRAPID.AQI ";
  // recents += "WHERE unit='µg/m³' OR unit='ppm' OR unit='ppb' ";
  // recents += "GROUP BY parameter , sensor_id , unit";
  // query += "JOIN ( " + recents + " ) recents ";

  // query +=
  //   "ON t.sensor_id = recents.sensor_id AND t.time = recents.latest_time AND t.parameter = recents.parameter ";
  // query += "WHERE	t.unit='µg/m³' OR t.unit='ppm' OR t.unit='ppb'";

  /* SQL query nicely formatted
        SELECT value, t.parameter, t.unit, t.time, t.sensor_id, sensor_name, latitude, longitude, source
        FROM AQI t
        INNER JOIN
            sensors 
        ON t.sensor_id = sensors.sensor_id
        JOIN (
            SELECT 
                parameter, unit, MAX(time) latest_time, sensor_id
            FROM AQI
            WHERE		unit='µg/m³' OR unit='ppm' OR unit='ppb'
            GROUP BY parameter , sensor_id , unit
            ) recents
        ON t.sensor_id = recents.sensor_id
        AND t.time = recents.latest_time
        AND t.parameter = recents.parameter
        WHERE		t.unit='µg/m³' OR t.unit='ppm' OR t.unit='ppb'
    */

  try {
    pool.query(query, [], (error, results) => {
      if (!results[0]) {
        // No results
        res.json({ status: "Not found" });
      } else {
        // Return measurements in a Feature Collection
        var geojson = {};
        geojson["type"] = "FeatureCollection";
        geojson["features"] = [];

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
                            "aqi": ___
                        },
                        [param2 name]: {
                            "value": ___,
                            "aqi": ___
                        },
                        "info": {
                            "sensorID": ____,
                            "sensorName": ____,
                            "source": OPENAQ/PURPLEAIR/CLARITY/DST/TSI
                        }
                    }
                 }
                 */

        var lat = Number(results[0].latitude);
        var long = Number(results[0].longitude);
        var lat_rounded = lat.toFixed(4);
        var long_rounded = long.toFixed(4);

        var sensorFeature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [long_rounded, lat_rounded],
          },
          properties: {},
        };

        var curr_sensor_id = results[0].sensor_id;
        var prev_sensor_id = results[0].sensor_id;

        for (var i = 0; i < results.length; ++i) {
          curr_sensor_id = results[i].sensor_id;

          if (curr_sensor_id != prev_sensor_id) {
            // reached a new sensor
            // close out the old feature
            var prev;
            if (i == 0) prev = 0;
            else prev = i - 1;
            sensorFeature["properties"]["info"] = {
              sensorID: results[prev].sensor_id,
              sensorName: results[prev].sensor_name,
              source: results[prev].source,
            };

            geojson["features"].push(sensorFeature);

            // start a new feature. need new var to prevent reference to same obj
            var newFeature = {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [],
              },
              properties: {},
            };
            sensorFeature = newFeature;

            // round latitude and longitude coordinates to 4 decimal places
            var lat = Number(results[i].latitude);
            var long = Number(results[i].longitude);
            var lat_rounded = lat.toFixed(4);
            var long_rounded = long.toFixed(4);
            sensorFeature["geometry"]["coordinates"] = [
              long_rounded,
              lat_rounded,
            ];
          }

          // add the parameter, measurement, and unit
          var param = results[i].parameter;
          sensorFeature["properties"][param] = {
            value: Number(results[i].value).toFixed(0), // round measurements to whole number
            unit: results[i].unit,
          };

          prev_sensor_id = curr_sensor_id;
        }

        // close out last feature
        sensorFeature["properties"]["info"] = {
          sensorID: results[results.length - 1].sensor_id,
          sensorName: results[results.length - 1].sensor_name,
          source: results[results.length - 1].source,
        };
        geojson["features"].push(sensorFeature);

        myCache.set(key, geojson);
        res.status(200).json(geojson);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

// Returns all sensors of specified type(s) in specified zipcode(s) with at least one of the specified pollutant(s)
// If nothing is specified for one of the three parameters, there won't be filtering on that parameter
// ex: http://localhost:8080/sensor?pollutant=pm2.5&zip_code=48209&type=OAQ
// ex of nothing specified for zipcode or sensor type and two pollutants specified: http://localhost:8080/sensor?pollutant=pm2.5&pollutant=NO2
// not sure long/lat is necessary delete if it isn't needed
app.get("/sensor", async (req, res) => {
  var query =
    " SELECT DISTINCT MRAPID.sensors.sensor_id, sensor_name" +
    " FROM MRAPID.measurements " +
    " LEFT JOIN MRAPID.sensors ON MRAPID.measurements.sensor_id = MRAPID.sensors.sensor_id " +
    " WHERE (";
  var params = [];
  if (req.query.zip_code != null) {
    if (typeof req.query.zip_code == "string") {
      query += " zip_code = ? AND";
      params.push(req.query.zip_code);
    } else {
      query += " (";
      for (let i = 0; i < req.query.zip_code.length - 1; i++) {
        query += " zip_code = ? OR";
        params.push(req.query.zip_code[i]);
      }
      query += " zip_code = ? ) AND";
      params.push(req.query.zip_code[req.query.zip_code.length - 1]);
    }
  }

  if (req.query.pollutant != null) {
    if (typeof req.query.pollutant == "string") {
      query += " parameter = ? AND";
      params.push(req.query.pollutant);
    } else {
      query += " (";
      for (let i = 0; i < req.query.pollutant.length - 1; i++) {
        query += " parameter = ? OR";
        params.push(req.query.pollutant[i]);
      }
      query += " parameter = ? ) AND";
      params.push(req.query.pollutant[req.query.pollutant.length - 1]);
    }
  }

  if (req.query.type != null) {
    if (typeof req.query.type == "string") {
      query += " sensor_name LIKE ? AND";
      params.push("%" + req.query.type + "%");
    } else {
      query += " (";
      for (let i = 0; i < req.query.type.length - 1; i++) {
        query += " sensor_name LIKE ? OR";
        params.push("%" + req.query.type[i] + "%");
      }
      query += " sensor_name LIKE ?) AND";
      params.push("%" + req.query.type[req.query.type.length - 1] + "%");
    }
  }

  query += " 1 )";
  try {
    pool.query(query, params, (error, results) => {
      if (!results[0]) {
        // No results
        res.json({ status: "Not found" });
      } else {
        // Return relevant sensors
        var sensors = [];
        for (var i = 0; i < results.length; ++i) {
          var newSensor = {
            name: results[i].sensor_name,
            id: results[i].sensor_id,
          };
          sensors.push(newSensor);
        }
        var output = { SensorList: sensors };
        res.status(200).json(output);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

// For each monitor, get most recent value of a specific pollutant and unit
// Request link format is "[server]/latest?pollutant=[pollutant]&unit=[unit]". ex: http://localhost:8080/latest?pollutant=pm2.5&unit=ug/m3
// Parameters: Use BC for Black Carbon
// Units: Use ug/m3 for µg/m³, p/cm3 for particles/cm³, and ppm or ppb for those.
app.get("/latest", async (req, res) => {
  // Format param for SQL request
  var pollutant;
  if (req.query.pollutant == "BC") pollutant = "Black C";
  else pollutant = req.query.pollutant;

  // Format unit for SQL request
  var unit;
  if (req.query.unit == "ug/m3") unit = "µg/m³";
  else if (req.query.unit == "p/cm3") unit = "particles/cm³";
  else unit = req.query.unit;

  // SQL command to get most recent measurements for a specific parameter
  var query =
    "SELECT DISTINCT value, parameter, unit, time, latitude, longitude FROM MRAPID.measurements t ";
  const join_lat_long =
    "INNER JOIN MRAPID.sensors ON t.sensor_id = MRAPID.sensors.sensor_id ";
  query += join_lat_long;

  const recents =
    "SELECT sensor_id, MAX(time) latest_time FROM MRAPID.measurements WHERE parameter = ? AND unit = ? GROUP BY sensor_id ";
  query += "JOIN ( " + recents + " ) recents ";

  query +=
    "ON t.sensor_id = recents.sensor_id AND t.time = recents.latest_time ";
  query = query + "WHERE t.parameter = ? AND unit = ?";

  /* SQL query nicely formatted, example using PM 2.5
        SELECT DISTINCT
            value, parameter, unit, time, latitude, longitude
        FROM
            measurements t
                INNER JOIN
            sensors ON t.sensor_id = sensors.sensor_id
                JOIN
            (SELECT 
                sensor_id, MAX(time) latest_time
            FROM
                measurements
            WHERE
                parameter = 'pm2.5' AND unit = 'µg/m³'
            GROUP BY sensor_id) recents ON t.sensor_id = recents.sensor_id
                AND t.time = recents.latest_time
        WHERE
            t.parameter = 'pm2.5' AND unit = 'µg/m³'
    */
  try {
    pool.query(query, [pollutant, unit, pollutant, unit], (error, results) => {
      if (!results)
        res.status(500).json({ message: "Error with the database query" });
      else if (!results[0]) {
        // No results
        res.json({ status: "Not found" });
      } else {
        // Return measurements in a Feature Collection
        var geojson = {};
        geojson["type"] = "FeatureCollection";
        geojson["features"] = [];

        for (var i = 0; i < results.length; ++i) {
          // round latitude and longitude coordinates to 4 decimal places
          var lat = Number(results[i].latitude);
          var long = Number(results[i].longitude);
          var lat_rounded = lat.toFixed(4);
          var long_rounded = long.toFixed(4);

          // round measurements to whole number
          var value;
          if (pollutant == "Black C")
            value = Number(results[i].value).toFixed(1);
          else value = Number(results[i].value).toFixed(0);

          var newFeature = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [long_rounded, lat_rounded],
            },
            properties: {
              param: value,
            },
          };
          geojson["features"].push(newFeature);
        }

        res.status(200).json(geojson);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

/*
    might delete/heavily rework, currently not really useful.
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
    date.setFullYear(date.getFullYear() - 1);
  } else if (req.query.timeframe == "week") {
    date.setDate(date.getDate() - 7);
  } else if (req.query.timeframe == "month") {
    date.setMonth(date.getMonth() - 1);
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
    query =
      "SELECT * FROM MRAPID.measurements WHERE (time > ?) ORDER BY parameter, time";
    params = [date];
  } else {
    if (req.query.pollutant.length == 1) {
      query =
        "SELECT * FROM MRAPID.measurements WHERE (parameter = ? AND time > ?) ORDER BY time";
      params.push(req.query.pollutant);
    } else {
      query = "SELECT * FROM MRAPID.measurements WHERE ((";
      req.query.pollutant.forEach((element) => {
        query += "(parameter = ?) || ";
        params.push(element);
      });
      query += "0) AND time > ?) ORDER BY parameter,time";
    }
    params.push(date);
  }
  console.log(query);
  try {
    pool.query(query, params, (error, results) => {
      console.log("results");
      console.log(results);
      //res.status(200).json({"results": date});
      if (!results)
        res.status(500).json({ message: "Error with the database query" });
      else if (!results[0]) {
        // No results
        res.json({ status: "No results" });
      } else {
        var output = {};
        var data = [];
        var current_parameter = results[0].parameter;
        for (var i = 0; i < results.length; i++) {
          if (results[i].parameter == current_parameter) {
            var newFeature = {
              time: results[i].time,
              measurement: results[i].value,
              sensor: results[i].sensor_name,
            };
            data.push(newFeature);
          } else {
            current_parameter = results[i].parameter;
            output[results[i - 1].parameter] = {
              unit: results[i - 1].unit,
              data: data,
            };
            data = [];
            i--;
          }
        }
        output[results[results.length - 1].parameter] = {
          unit: results[results.length - 1].unit,
          data: data,
        };
        res.status(200).json(output);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

/* Returns data for a specific monitor and pollutant between two specified dates (inclusive)
    Request link format is "[server]/history?sensor=[sensorID]&pollutant=[pollutant]&unit=[unit]&start=[time]&end=[time]&step=[h/d/m]".
    Required:
        Sensor - sensor ID
        Pollutant - format as in db except use BC for Black Carbon
        Unit - for µg/m³, use ug/m3. For particles/cm³, use p/cm3. For ppb and ppm, use as is.
    Optional:
        Start - format yyyy-mm-dd. Default is 1/1/2023 (no data in the database before this date)
        End - format yyyy-mm-dd. Default is current day
        Step - use h for hourly, d for daily, m for monthly, y for yearly. Default is hourly
    ex: http://localhost:8080/history?sensor=260990004O&pollutant=pm2.5&unit=ug/m3&start=2023-07-01&end=2023-07-07&step=d
    Return format:
        {
            "results": [
                {
                    "time": 2023-06-28T00:00:00.000Z,
                    "value": ___,
                    "sensor_id": __
                },
                {
                    "time": 2023-06-28T01:00:00.000Z,
                    "value": ___,
                    "sensor_id": __
                },
            ]
        }
*/
app.get("/history", async (req, res) => {
  if (!req.query.sensor || !req.query.pollutant || !req.query.unit) {
    // error handling for required params
    res.status(200).json({
      message: "Must specify sensor ID(s), pollutant, and unit in the endpoint",
    });
    return;
  }

  var table;
  if (req.query.step == "h") table = "hourly_mean";
  else if (req.query.step == "d") table = "daily_mean";
  else if (req.query.step == "m") table = "monthly_mean";
  else if (req.query.step == "y") table = "yearly_mean";
  else table = "hourly_mean"; // default

  var query =
    "SELECT value, time, parameter, unit, t.sensor_id, sensor_name FROM MRAPID." +
    table +
    " t ";
  query += "JOIN MRAPID.sensors ON t.sensor_id = sensors.sensor_id ";
  query += "WHERE time BETWEEN ? AND ? AND parameter = ? AND unit = ? AND (";

  // add sensors to query
  var sensorString = req.query.sensor;
  var sensors = sensorString.split(","); // put sensor list into array
  for (var i = 0; i < sensors.length; ++i) {
    if (i != 0) query += " OR";
    query += " t.sensor_id = '";
    query += sensors[i];
    query += "'";
  }
  query += " ) ORDER BY time";

  var pollutant;
  if (req.query.pollutant == "BC") pollutant = "Black C";
  else pollutant = req.query.pollutant;

  var start;
  if (req.query.start) start = req.query.start;
  else start = "2023-01-01";

  var end;
  if (req.query.end) end = req.query.end;
  else {
    // today's date
    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2); // adjust 0 before single digit date
    let month = ("0" + (date.getMonth() + 1)).slice(-2); // adjust 0 before single digit month
    end = date.getFullYear() + "-" + month + "-" + day;
  }

  // request won't register with formatting of the cubic m/cm directly in the endpoint link
  var formatted_unit;
  if (req.query.unit == "ug/m3") formatted_unit = "µg/m³";
  else if (req.query.unit == "p/cm3") formatted_unit = "particles/cm³";
  else formatted_unit = req.query.unit;

  var params = [start, end, pollutant, formatted_unit];

  try {
    pool.query(query, params, (error, results) => {
      if (!results)
        res.status(500).json({ message: "Error with the database query" });
      else if (!results[0]) {
        // No results
        res.json({ status: "No results" });
      } else {
        var output = {};
        output["results"] = [];

        for (var i = 0; i < results.length; ++i) {
          var measurement = {
            time: results[i].time,
            value: results[i].value,
            sensor_id: results[i].sensor_id,
          };
          output["results"].push(measurement);
        }

        res.status(200).json(output);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

app.get("/latestAll", async (req, res) => {
  const sensorId = req.query.sensor_id;

  if (!sensorId) {
    res.status(400).json({ message: "Sensor ID is required" });
    return;
  }

  // SQL command to get all measurements for a specific sensor and join with sensors table
  const query = `
    SELECT
        rm.value, rm.parameter, rm.unit, rm.time, 
        s.sensor_name, s.source, s.latitude, s.longitude, 
        s.street, s.zip_code, s.region, s.param_list
    FROM
        recent_measurements rm
    JOIN
        sensors s ON rm.sensor_id = s.sensor_id
    WHERE
        rm.sensor_id = ?
  `;

  try {
    pool.query(query, [sensorId], (error, results) => {
      if (error) {
        console.error("Error querying the database: ", error);
        res.status(500).json({ message: "Error querying the database" });
      } else if (!results.length) {
        res.status(404).json({ status: "Not found" });
      } else {
        // Extract sensor information (assuming it's the same for all measurements)
        const sensorInfo = results[0];

        // Filter the results to include only the most recent measurement for each parameter
        const recentMeasurements = {};
        results.forEach((result) => {
          const parameter = result.parameter;
          if (
            !recentMeasurements[parameter] ||
            new Date(result.time) > new Date(recentMeasurements[parameter].time)
          ) {
            recentMeasurements[parameter] = result;
          }
        });

        // Convert the filtered measurements to an array
        const measurements = Object.values(recentMeasurements).map(
          (result) => ({
            parameter: result.parameter,
            value: Number(result.value).toFixed(
              result.parameter === "Black C" ? 1 : 0
            ),
            unit: result.unit,
            time: result.time,
          })
        );

        // Construct the response object
        const response = {
          results: {
            sensor_id: sensorId,
            sensor_name: sensorInfo.sensor_name,
            source: sensorInfo.source,
            location: {
              latitude: sensorInfo.latitude,
              longitude: sensorInfo.longitude,
              street: sensorInfo.street,
              zip_code: sensorInfo.zip_code,
              region: sensorInfo.region,
            },
            param_list: sensorInfo.param_list,
            measurements: measurements,
          },
        };

        res.status(200).json(response);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(500).json({ message: "Error querying the database" });
  }
});

// Returns interpolated pollutant concentrations using data from the last 4 hours as geojson polygons
// API link format is "[server]/latest?pollutant=[pollutant]&unit=[unit]&type=[AQI or Concentration]". ex: http://localhost:8080/interpolatedMap?pollutant=pm2.5&unit=ug/m3&type=aqi
// Parameters: Use BC for Black Carbon
// Units: Use ug/m3 for µg/m³, p/cm3 for particles/cm³, and ppm or ppb for those.
app.get("/interpolatedMap", async (req, res) => {
  var pollutant;
  if (req.query.pollutant == "BC") pollutant = "Black C";
  else pollutant = req.query.pollutant;

  var dataType;
  if (req.query.type == "aqi") dataType = "AQI";
  else dataType = "recent_measurements";

  // Format unit for SQL request
  var unit;
  if (req.query.unit == "ug/m3") unit = "µg/m³";
  else if (req.query.unit == "p/cm3") unit = "particles/cm³";
  else unit = req.query.unit;

  // time
  const formatOptions = {
    timeZone: "America/Detroit",
    dateStyle: "short",
    hour12: false,
    timeStyle: "medium",
  };

  //var currTime = new Intl.DateTimeFormat("en-CA", formatOptions).format(Date.now()).split(',').join('');
  //console.log(currTime)
  var sub = Date.now() - 14400000; // subtract 4 hours
  //var sub = Date.now() - 172800000;  // for testing using last 48 hrs
  var minTime = new Intl.DateTimeFormat("en-CA", formatOptions)
    .format(sub)
    .split(",")
    .join("");
  //console.log(subTime)

  var query =
    `SELECT longitude, latitude, t.sensor_id, AVG(t.value) AS avgMeasurement FROM MRAPID.${dataType} t ` +
    //"SELECT longitude, latitude, t.sensor_id, AVG(t.value) AS avgMeasurement FROM MRAPID.measurements t " +  // for testing
    //"SELECT t.sensor_id, AVG(CASE WHEN t.time > ? THEN t.value ELSE NULL END) AS avgMeasurement FROM MRAPID.recent_measurements t " +
    //"SELECT t.parameter, t.sensor_id, t.value, t.time FROM MRAPID.recent_measurements t " +
    "LEFT JOIN MRAPID.sensors ON t.sensor_id = MRAPID.sensors.sensor_id " +
    "WHERE MRAPID.sensors.longitude > -83.16 && MRAPID.sensors.longitude < -82.85 && MRAPID.sensors.latitude > 42.16 && MRAPID.sensors.latitude < 42.57 AND t.time > ? AND t.parameter = ? AND t.unit = ? " +
    "GROUP BY t.sensor_id, longitude, latitude";

  var t = [];
  var x = [
    /* longitude coordinates */
  ];
  var y = [
    /* latitude coordinates */
  ];
  var predictions = [];

  //minTime = '2024-05-18 12:00:32'
  //currTime = '2024-05-18 16:00:32'
  try {
    pool.query(query, [minTime, pollutant, unit], (error, results) => {
      if (!results)
        res.status(500).json({ message: "Error with the database query" });
      else if (!results[0]) {
        // No results
        res.json({ status: "Not found" });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; ++i) {
          t.push(results[i].avgMeasurement);
          x.push(results[i].longitude);
          y.push(results[i].latitude);
        }
        console.log(t);
        //console.log(x)

        // testing with 13 points
        //t = [6,9,1,21,7,9,14,8,6,7,6,8,11,23,24,2,8,3,9,17,26,26,23,30,29,0,5,26,30,33,10,31]
        //x = [-83.0756,-83.1296,-83.1296,-83.0431,-82.9706,-83.1039,-83.1500,-83.0008,-83.1072,-83.0919,-83.1035,-83.1579,-83.1294,-83.1570,-83.1350,-83.1439,-83.0960,-83.1488,-82.9711,-83.0942,-83.0640,-83.0990,-83.0433,-82.9844,-83.0089,-82.9819,-82.9577,-82.9708,-82.9296,-82.9164,-82.9337,-82.9450]
        //y = [42.3302,42.2960,42.2960,42.3699,42.3864,42.3679,42.3075,42.4308,42.3042,42.3122,42.3121,42.2617,42.2958,42.4693,42.4455,42.2793,42.3095,42.3075,42.3863,42.3172,42.3266,42.3631,42.3698,42.3564,42.3954,42.3844,42.3846,42.3862,42.3742,42.5042,42.5382,42.5591]

        var variogram = kriging.train(t,x,y,"gaussian", 0.02, 50);
        var predictVal = [];
        var geojson = {};
        geojson["type"] = "FeatureCollection";
        geojson["features"] = [];
        for (let x = -83.266; x < -82.958; x += 0.001) {
          predictVal.push(pred);
          for (let y = 42.261; y < 42.47; y += 0.001) {
            var pred = kriging.predict(x, y, variogram);
            var newFeature = {
              type: "Feature",
              geometry: {
                type: "Polygon",
                "coordinates": [
                  [ [x, y], [x+0.001,y], [x+0.001,y+0.001], [x,y+0.001] ]
                ]
              },
              properties: {
                pollutant: pred,
              },
            };
            geojson["features"].push(newFeature);
          }
        }
        //var variogram = kriging.train(t, x, y, model, sigma2, alpha);
        //res.json({status: "ok! :)"})
        //res.status(200).json({"pred": predictVal});
        console.log(predictVal);
        res.status(200).json(geojson);
      }
    });
  } catch (error) {
    console.error("Error querying the database: ", error);
    res.status(5);
  }
});

