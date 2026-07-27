import express from "express";
import cors from "cors";
import mysql from "mysql";
import { Parser } from "json2csv";
import { fileURLToPath } from "url";

const METEOROLOGICAL_DATA_QUERY = `
  SELECT *
  FROM MRAPID.meteorological_data
  WHERE wind_speed IS NOT NULL
    AND wind_direction IS NOT NULL
    AND CONCAT(
      year, '-',
      LPAD(month, 2, '0'), '-',
      LPAD(day, 2, '0'), ' ',
      LPAD(hour, 2, '0'), ':00:00'
    ) BETWEEN ? AND ?
`;

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPort() {
  return Number(process.env.PORT || process.env.port || 8080);
}

export function createDbConfig() {
  const config = {
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    database: requiredEnv("DB_NAME"),
  };

  if (process.env.DB_SOCKET_PATH) {
    return { ...config, socketPath: process.env.DB_SOCKET_PATH };
  }

  return {
    ...config,
    host: requiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
  };
}

export function createPool(config = createDbConfig()) {
  return mysql.createPool(config);
}

function queryPool(pool, sql, params) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

function verifyConnection(pool) {
  pool.getConnection((err, connection) => {
    if (err) {
      if (connection) connection.release();
      console.error("Error connecting to the database:", err);
      return;
    }

    connection.release();
    console.log("Connected to the database.");
  });
}

export function createApp(pool) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ status: "Ready! :)" });
  });

  app.get("/meteorological_data/csv", async (req, res) => {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ message: "start_date and end_date are required" });
    }

    try {
      const results = await queryPool(pool, METEOROLOGICAL_DATA_QUERY, [
        start_date,
        end_date,
      ]);

      if (!results.length) {
        return res.status(404).json({ message: "No data found" });
      }

      const csv = new Parser().parse(results);
      res.header("Content-Type", "text/csv");
      res.attachment("meteorological_data.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error querying the database:", error);
      res.status(500).json({ message: "Error querying the database" });
    }
  });

  return app;
}

export function startServer() {
  const pool = createPool();
  verifyConnection(pool);

  const app = createApp(pool);
  const port = getPort();

  app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
  });

  return app;
}

const isEntrypoint =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isEntrypoint) {
  startServer();
}
