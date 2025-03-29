"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var connection_exports = {};
__export(connection_exports, {
  setDBConfig: () => setDBConfig,
  useConnection: () => useConnection
});
module.exports = __toCommonJS(connection_exports);
var import_promise = __toESM(require("mysql2/promise"));
let dbConfig = {};
function setDBConfig(config) {
  dbConfig = config;
}
async function useConnection(cb) {
  let connection;
  try {
    connection = await import_promise.default.createConnection(dbConfig);
    console.log(`Connected to database: ${dbConfig.host}`);
    return await cb(connection);
  } catch (err) {
    throw new Error("Error with database operation");
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  setDBConfig,
  useConnection
});
//# sourceMappingURL=connection.js.map
