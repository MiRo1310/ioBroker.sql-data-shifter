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
var tableSize_exports = {};
__export(tableSize_exports, {
  initTableSizes: () => initTableSizes,
  tableSizeCron: () => tableSizeCron
});
module.exports = __toCommonJS(tableSize_exports);
var import_querys = require("./querys");
var import_main = require("../main");
var import_node_schedule = __toESM(require("node-schedule"));
var import_datapoints = require("./datapoints");
var import_lib = require("../lib/lib");
const getTableSizes = async () => {
  const tables = await (0, import_querys.getAllTables)();
  const tableSizes = [];
  await Promise.all(
    tables.map(async (table) => {
      tableSizes.push(await (0, import_querys.getTableSize)(import_main.dbConfig.database, table));
    })
  );
  return tableSizes;
};
let tableSizeCron;
const initTableSizes = async (cron) => {
  if (cron === "0") {
    return;
  }
  await setTableSize(true);
  tableSizeCron = import_node_schedule.default.scheduleJob(cron, async () => {
    await setTableSize();
  });
};
async function setTableSize(init) {
  const tableSizes = await getTableSizes();
  if (init) {
    await createDatapoints(tableSizes);
  }
  await import_main._this.setState(import_datapoints.datapoints.tableSize, (0, import_lib.toJSON)(tableSizes), true);
  for (const tableSize of tableSizes) {
    checkSizes(tableSize);
    await import_main._this.setState(`${import_datapoints.datapoints.tableSizeFolder}.${tableSize.table}`, tableSize["size_(MB)"], true);
  }
}
function checkSizes(tableSize) {
  const { info, warning, error } = import_main._this.config;
  if (error && tableSize["size_(MB)"] >= error) {
    import_main._this.log.error(`Table ${tableSize.table} is larger than error setting ${tableSize["size_(MB)"]} MB`);
    return;
  }
  if (warning && tableSize["size_(MB)"] >= warning) {
    import_main._this.log.warn(`Table ${tableSize.table} is larger than warning setting: ${tableSize["size_(MB)"]} MB`);
    return;
  }
  if (info) {
    import_main._this.log.info(`Size of table ${tableSize.table} is ${tableSize["size_(MB)"]} MB`);
    return;
  }
}
async function createDatapoints(tableSizes) {
  await import_main._this.setObjectNotExistsAsync(import_datapoints.datapoints.tableSize, {
    type: "state",
    common: {
      name: "tableSizeJson",
      type: "string",
      role: "json",
      read: true,
      write: false
    },
    native: {}
  });
  for (const tableSize of tableSizes) {
    await import_main._this.setObjectNotExistsAsync(`${import_datapoints.datapoints.tableSizeFolder}.${tableSize.table}`, {
      type: "state",
      common: {
        name: tableSize.table,
        type: "number",
        role: "indicator",
        read: true,
        write: false,
        unit: "MB"
      },
      native: {}
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  initTableSizes,
  tableSizeCron
});
//# sourceMappingURL=tableSize.js.map
