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
  saveData: () => saveData
});
module.exports = __toCommonJS(querys_exports);
var import_connection = require("../connection");
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
                VARCHAR
            (
                50
            ),
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
    await connection.execute(saveQuery, [entry.id, date, val, (_a = entry.unit) != null ? _a : ""]);
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createNewTable,
  saveData
});
//# sourceMappingURL=querys.js.map
