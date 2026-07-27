import test from "node:test";
import assert from "node:assert/strict";
import { createDbConfig, getPort } from "./API.js";

test("createDbConfig uses host and port when no socket path is set", () => {
  process.env.DB_USER = "user";
  process.env.DB_PASSWORD = "pass";
  process.env.DB_NAME = "db";
  process.env.DB_HOST = "localhost";
  delete process.env.DB_SOCKET_PATH;
  delete process.env.DB_PORT;

  assert.deepEqual(createDbConfig(), {
    user: "user",
    password: "pass",
    database: "db",
    host: "localhost",
    port: 3306,
  });
});

test("createDbConfig prefers socket path when provided", () => {
  process.env.DB_USER = "user";
  process.env.DB_PASSWORD = "pass";
  process.env.DB_NAME = "db";
  process.env.DB_SOCKET_PATH = "/cloudsql/project:region:instance";
  process.env.DB_HOST = "localhost";

  assert.deepEqual(createDbConfig(), {
    user: "user",
    password: "pass",
    database: "db",
    socketPath: "/cloudsql/project:region:instance",
  });
});

test("getPort prefers PORT over lowercase port", () => {
  process.env.PORT = "9000";
  process.env.port = "7000";

  assert.equal(getPort(), 9000);
});
