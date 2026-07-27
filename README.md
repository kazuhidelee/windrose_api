# WINDROSE_API

Small Express API for exporting meteorological wind data from a MySQL database as CSV.

## What it does

- Starts an HTTP server with CORS enabled.
- Connects to the `MRAPID` MySQL database.
- Exposes a health-style root route at `/`.
- Exposes a CSV export route at `/meteorological_data/csv`.

Current implementation lives in [API.js](./API.js).

## Tech stack

- Node.js
- Express
- MySQL
- `json2csv`
- `cors`

## Project structure

```text
.
├── API.js          # Server startup, env config, routes, DB helpers
├── API.test.js     # Minimal config tests
├── kriging.js      # Kriging helper code, not currently used by any route
├── .env.example    # Example environment variables
├── package.json
└── README.md
```

## Requirements

- Node.js 18+ recommended
- npm
- Access to the `MRAPID` MySQL database
- A valid MySQL connection for your environment

## Install

```bash
npm install
```

## Run

```bash
cp .env.example .env
# then export the values you want to use in your shell
npm start
```

By default the server listens on port `8080`.

The server now supports `PORT` and falls back to lowercase `port` for compatibility.

## Test

```bash
npm test
```

## API

### `GET /`

Simple readiness check.

Example response:

```json
{
  "status": "Ready! :)"
}
```

### `GET /meteorological_data/csv`

Exports rows from `MRAPID.meteorological_data` where both `wind_speed` and `wind_direction` are present and the reconstructed timestamp falls between the requested bounds.

#### Query parameters

- `start_date` required, format like `2017-01-01 00:00:00`
- `end_date` required, format like `2017-01-31 23:59:59`

#### Example request

```text
http://localhost:8080/meteorological_data/csv?start_date=2017-01-01%2000:00:00&end_date=2017-01-31%2023:59:59
```

#### Success response

- Status: `200 OK`
- Content-Type: `text/csv`
- Attachment filename: `meteorological_data.csv`

#### Error responses

- `400` when `start_date` or `end_date` is missing
- `404` when no matching data is found
- `500` when the database query fails

## Database configuration

Set these environment variables before starting the server:

- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_HOST` and optionally `DB_PORT`

If you are connecting through a Cloud SQL Unix socket, set this instead of `DB_HOST`:

- `DB_SOCKET_PATH`

## Current limitations

- `kriging.js` is included in the repo but not currently connected to the API surface.
- The API currently supports CSV export only.
- The SQL query assumes `MRAPID.meteorological_data` exists with `year`, `month`, `day`, `hour`, `wind_speed`, and `wind_direction` columns.

## Suggested next cleanup

- Add one route-level smoke test for the CSV endpoint
- Document the database schema expected by `meteorological_data`
