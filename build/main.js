"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_connection = require("./connection");
var import_lib = require("./lib/lib");
var import_node_schedule = __toESM(require("node-schedule"));
var import_querys = require("./app/querys");
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
    const dbConfig = {};
    if (!this.config.user || !this.config.password || !this.config.database) {
      return;
    }
    dbConfig.host = this.config.ip;
    dbConfig.user = this.config.user;
    dbConfig.password = this.config.password;
    dbConfig.database = this.config.database;
    (0, import_connection.setDBConfig)(dbConfig);
    let isConnectionSuccessful = false;
    try {
      isConnectionSuccessful = await (0, import_connection.useConnection)(async (connection) => {
        if (connection) {
          await this.setState("info.connection", true, true);
          return true;
        }
        this.log.error("Connection failed");
        return false;
      });
    } catch (e) {
      console.error(e);
    }
    if (!isConnectionSuccessful) {
      return;
    }
    const tableObject = (0, import_lib.addParamsToTableItem)(this.config.table);
    for (const entry of tableObject) {
      if (!entry.active) {
        continue;
      }
      await (0, import_querys.createNewTable)(entry.tableTo);
      const timeInMilliseconds = entry.time * 1e3;
      const job = import_node_schedule.default.scheduleJob(entry.schedule, async () => {
        this.log.debug(`Schedule job for ${entry.id} started, from ${entry.tableFrom} to ${entry.tableTo}`);
        const table = entry.tableFrom;
        await (0, import_connection.useConnection)(async (connection) => {
          const date = Date.now();
          console.log("id ", entry.id);
          console.log("table", table);
          const selectQuery = `SELECT *
                                         from ${table}
                                         WHERE id = ?
                                           AND ts <= ?
                                           AND ts > ?`;
          const [rows] = await connection.execute(selectQuery, [
            entry.id,
            date,
            entry.oldTimestamp || date - timeInMilliseconds
          ]);
          console.log(entry.oldTimestamp || date - timeInMilliseconds);
          console.log(date, date - timeInMilliseconds);
          console.log(entry.oldTimestamp);
          console.log("rows", rows);
          entry.oldTimestamp = date;
          const result = rows;
          if (result.length === 0) {
            console.log("Write zero ", entry.writeZero);
            if (entry.writeZero) {
              await (0, import_querys.saveData)(entry, date, 0);
            }
            this.log.debug(`No data found for ${entry.id}`);
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
                                             FROM ${table}
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
  onMessage(obj) {
    this.log.error("getIds");
    this.log.error(JSON.stringify(obj));
    switch (obj.command) {
      case "id": {
        const result = [
          { label: "test", value: 1 },
          { label: "test2", value: 2 }
        ];
        obj.callback && this.sendTo(obj.from, obj.command, result, obj.callback);
        break;
      }
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new SqlDataShifter(options);
} else {
  (() => new SqlDataShifter())();
}
//# sourceMappingURL=main.js.map
