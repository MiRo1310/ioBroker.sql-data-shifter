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
var main_exports = {};
__export(main_exports, {
  _this: () => _this,
  dbConfig: () => dbConfig
});
module.exports = __toCommonJS(main_exports);
var utils = __toESM(require("@iobroker/adapter-core"));
var import_connection = require("./connection");
var import_lib = require("./lib/lib");
var import_node_schedule = __toESM(require("node-schedule"));
var import_querys = require("./app/querys");
var import_getTablesForFrontendUsage = require("./app/getTablesForFrontendUsage");
var import_tableSize = require("./app/tableSize");
const dbConfig = {};
let _this;
class SqlDataShifter extends utils.Adapter {
  scheduleJob;
  constructor(options = {}) {
    super({
      ...options,
      name: "sql-data-shifter"
    });
    this.scheduleJob = [];
    this.on("ready", this.onReady.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    const { user, database, password, ip } = this.config;
    if (!user || !password || !database) {
      return;
    }
    _this = this;
    dbConfig.host = ip;
    dbConfig.user = user;
    dbConfig.password = password;
    dbConfig.database = database;
    const isConnectionSuccessful = await (0, import_connection.useConnection)(async (connection) => {
      if (connection) {
        await this.setState("info.connection", true, true);
        return true;
      }
      this.log.error("Connection failed");
      return false;
    });
    if (!isConnectionSuccessful) {
      return;
    }
    await (0, import_querys.setTimeZone)(this.config.timeZone);
    await (0, import_tableSize.initTableSizes)(this.config.tableSizeCron);
    const tableObject = (0, import_lib.addParamsToTableItem)(this.config.table);
    for (const entry of tableObject) {
      if (!entry.active) {
        continue;
      }
      await (0, import_querys.createNewTable)(entry.tableTo);
      const timeInMilliseconds = entry.time * 1e3;
      const job = import_node_schedule.default.scheduleJob(entry.schedule, async () => {
        await (0, import_connection.useConnection)(async (connection) => {
          const date = Date.now();
          this.log.debug(
            `Schedule job for id: ${entry.id} started, from ${entry.tableFrom} to ${entry.tableTo}`
          );
          const selectQuery = `SELECT *
                                         from ${entry.tableFrom}
                                         WHERE id = ?
                                           AND ts <= ?
                                           AND ts > ?`;
          const [rows] = await connection.execute(selectQuery, [
            entry.id,
            date,
            entry.oldTimestamp || date - timeInMilliseconds
          ]);
          this.log.debug(`Date: ${date}, Old date: ${entry.oldTimestamp}`);
          this.log.debug(`Rows: ${JSON.stringify(rows)}`);
          entry.oldTimestamp = date;
          const result = rows;
          if (result.length === 0) {
            if (entry.writeZero) {
              await (0, import_querys.saveData)(entry, date, 0);
            }
            this.log.debug(`No data found for ${entry.id} in ${entry.tableFrom}`);
            return;
          }
          if (entry.operation === "sum") {
            const sum = (0, import_lib.sumResult)(result) * entry.factor;
            if (sum === 0 && !entry.writeZero) {
              return;
            }
            await (0, import_querys.saveData)(entry, date, sum);
          }
          if (entry.operation === "dif") {
            const sum = (0, import_lib.differenceResult)(result) * entry.factor;
            if (sum === 0 && !entry.writeZero) {
              return;
            }
            await (0, import_querys.saveData)(entry, date, sum);
          }
          if (entry.operation === "avg") {
            const average = (0, import_lib.calculateAverage)(result) * entry.factor;
            if (average === 0 && !entry.writeZero) {
              return;
            }
            await (0, import_querys.saveData)(entry, date, average);
          }
          if (entry.operation === "all") {
            await (0, import_querys.saveDataArray)(entry, result);
          }
          if (entry.delete) {
            const deleteQuery = `DELETE
                                             FROM ${entry.tableFrom}
                                             WHERE id = ?
                                               AND ts <= ?`;
            await connection.execute(deleteQuery, [entry.id, date]);
          }
        });
      });
      this.scheduleJob.push(job);
    }
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback Callback
   */
  onUnload(callback) {
    try {
      this.scheduleJob.forEach((job) => job.cancel());
      import_tableSize.tableSizeCron.cancel();
      callback();
    } catch (e) {
      console.error(e);
      callback();
    }
  }
  // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
  // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
  // /**
  //  * Is called if a subscribed object changes
  //  */
  // private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
  //     if (obj) {
  //         // The object was changed
  //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
  //     } else {
  //         // The object was deleted
  //         this.log.info(`object ${id} deleted`);
  //     }
  // }
  // /**
  //  * Is called if a subscribed state changes
  //  *
  //  * @param id
  //  * @param state
  //  */
  // private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
  //     if (state) {
  //         // The state was changed
  //         this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
  //     } else {
  //         // The state was deleted
  //         this.log.info(`state ${id} deleted`);
  //     }
  // }
  // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
  // /**
  //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
  //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
  //  */
  async onMessage(obj) {
    switch (obj.command) {
      case "id": {
        const result = await (0, import_getTablesForFrontendUsage.getDatapointsTable)();
        const options = result.map((item) => ({
          label: `${item.id} | ${item.name}`,
          value: item.id
        }));
        obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
        break;
      }
      case "tableFrom": {
        const tables = await (0, import_querys.getAllTables)();
        const options = tables.map((item) => ({
          label: item,
          value: item
        }));
        obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
      }
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new SqlDataShifter(options);
} else {
  (() => new SqlDataShifter())();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  _this,
  dbConfig
});
//# sourceMappingURL=main.js.map
