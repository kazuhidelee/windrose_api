import express from "express";
import cors from "cors";
import mysql from "mysql";
import NodeCache from "node-cache";
import { kriging } from "./kriging.js";
import { Parser } from "json2csv"; 

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
  host: "34.171.19.205",
  // socketPath: "/cloudsql/mrapid:us-central1:mrapid",
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

// exporting meteological wind data into csv files
//Request format: 
//http://localhost:8080/meteorological_data/csv?year=""&month=""&day=""&hour=""
app.get("/meteorological_data/csv", async (req, res) =>{
  const { year, month, day, hour } = req.query;

  let query = `
    SELECT * 
    FROM MRAPID.meteorological_data 
    WHERE wind_speed IS NOT NULL AND wind_direction IS NOT NULL
  `;

  let queryParams = [];


  if (year) {
    query += " AND year = ?";
    queryParams.push(year);
  }
  if (month) {
    query += " AND month = ?";
    queryParams.push(month);
  }
  if (day) {
    query += " AND day = ?";
    queryParams.push(day);
  }
  if (hour) {
    query += " AND hour = ?";
    queryParams.push(hour);
  }

  try {
    pool.query(query, queryParams, (error, results) => {
      if (error) {
        res.status(500).json({ message: "Error querying the database" });
        return;
      }

      if (!results || results.length === 0) {
        res.status(404).json({ message: "No data found" });
        return;
      }

      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(results);

      res.header("Content-Type", "text/csv");
      res.attachment("meteological_data.csv");
      res.send(csv);
    });
  } catch(error){
    console.error("Error querying the database: ", error);
    res.status(500).json({message: "Error querying the database"});
  }
});
