"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var querys_exports = {};
__export(querys_exports, {
  createNewTable: () => createNewTable,
  getAllTables: () => getAllTables,
  getTableSize: () => getTableSize,
  saveData: () => saveData,
  saveDataArray: () => saveDataArray,
  setTimeZone: () => setTimeZone
});
module.exports = __toCommonJS(querys_exports);
var import_connection = require("../connection");
var import_lib = require("../lib/lib");
async function createNewTable(table) {
  return (0, import_connection.useConnection)(async (connection) => {
    const query = `
            CREATE TABLE IF NOT EXISTS ${table}
            (
                id
                    INT,
                ts
                    BIGINT,
                val
                    DOUBLE,
                unit
                    VARCHAR(50),
                createdAt
                    TIMESTAMP
                    DEFAULT
                        CURRENT_TIMESTAMP
            )`;
    await connection.query(query);
  });
}
const saveData = async (entry, date, val) => {
  return (0, import_connection.useConnection)(async (connection) => {
    var _a;
    const saveQuery = `INSERT INTO ${entry.tableTo} (id, ts, val, unit)
                           VALUES (?, ?, ?, ?)`;
    if (!(0, import_lib.isDefined)(val)) {
      return;
    }
    await connection.execute(saveQuery, [entry.id, date, (0, import_lib.roundValue)(entry, val), (_a = entry.unit) != null ? _a : ""]);
  });
};
const saveDataArray = async (entry, table) => {
  return (0, import_connection.useConnection)(async (connection) => {
    var _a;
    const saveQuery = `INSERT INTO ${entry.tableTo} (id, ts, val, unit)
                           VALUES (?, ?, ?, ?)`;
    for (const row of table) {
      if (!(0, import_lib.isDefined)(row.val)) {
        continue;
      }
      if (row.val === 0 && !entry.writeZero) {
        continue;
      }
      await connection.execute(saveQuery, [entry.id, row.ts, (0, import_lib.roundValue)(entry, row.val), (_a = entry.unit) != null ? _a : ""]);
    }
  });
};
const getAllTables = async () => {
  return (0, import_connection.useConnection)(async (connection) => {
    const [rows] = await connection.query("SHOW TABLES");
    const result = rows;
    return result.map((row) => {
      return Object.keys(row).map((key) => row[key])[0];
    });
  });
};
const setTimeZone = async (timeZone) => {
  if (timeZone === "0" || !timeZone) {
    return;
  }
  return await (0, import_connection.useConnection)(async (connection) => {
    const query = `SET time_zone = ?`;
    await connection.query(query, [timeZone]);
  });
};
const getTableSize = async (database, table) => {
  return await (0, import_connection.useConnection)(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT table_name                                             AS "table",
                    round(((data_length + index_length) / 1024 / 1024), 2) AS "size_(MB)"
             FROM information_schema.TABLES
             WHERE table_schema = ?
               AND table_name = ?;
            `,
      [database, table]
    );
    if (rows.length) {
      return rows[0];
    }
    throw new Error(`Tabelle ${table} nicht gefunden.`);
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createNewTable,
  getAllTables,
  getTableSize,
  saveData,
  saveDataArray,
  setTimeZone
});
//# sourceMappingURL=querys.js.map
