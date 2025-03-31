/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import type { DBConfig, SqlNumberTable } from "./types/types";
import { setDBConfig, useConnection } from "./connection";
import { calculateAverage, differenceResult, sumResult } from "./lib/lib";
import type { Job } from "node-schedule";
// eslint-disable-next-line no-duplicate-imports
import schedule from "node-schedule";
import { createNewTable, saveData } from "./lib/querys";

class SqlDataShifter extends utils.Adapter {
    private scheduleJob: Job[];

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: "sql-data-shifter",
        });
        this.scheduleJob = [];
        this.on("ready", this.onReady.bind(this));
        // this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        console.log("SqlDataShifter ready");
        const dbConfig: DBConfig = {} as DBConfig;

        if (!this.config.user || !this.config.password || !this.config.database) {
            return;
        }

        dbConfig.host = this.config.ip;
        dbConfig.user = this.config.user;
        dbConfig.password = this.config.password;
        dbConfig.database = this.config.database;

        setDBConfig(dbConfig);
        let isConnectionSuccessful = false;
        try {
            isConnectionSuccessful = await useConnection(async (connection) => {
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

        this.log.debug(JSON.stringify(this.config));

        let oldTimestamp = 0;

        for (const entry of this.config.table) {
            if (!entry.active) {
                continue;
            }
            await createNewTable(entry.tableTo);

            this.scheduleJob.push(
                schedule.scheduleJob(entry.schedule, async () => {
                    const table = entry.tableFrom;

                    await useConnection(async (connection) => {
                        const date = Date.now();

                        let selectQuery: string;
                        if (entry.delete) {
                            selectQuery = `SELECT *
                                           from ${table}
                                           WHERE id = ?
                                             AND ts <= ?`;
                        } else {
                            selectQuery = `SELECT *
                                           from ${table}
                                           WHERE id = ?
                                             AND ts <= ?
                                             AND ts > ?`;
                        }
                        const [rows] = await connection.execute(selectQuery, [entry.id, date, oldTimestamp]);
                        oldTimestamp = date;
                        const result = rows as SqlNumberTable[];

                        if (result.length === 0) {
                            return;
                        }

                        if (entry.operation === "sum") {
                            const sum = sumResult(result) * entry.factor;
                            await saveData(entry, date, sum);
                        }

                        if (entry.operation === "dif") {
                            const sum = differenceResult(result) * entry.factor;
                            await saveData(entry, date, sum);
                        }

                        if (entry.operation === "avg") {
                            const average = calculateAverage(result) * entry.factor;
                            await saveData(entry, date, average);
                        }

                        if (entry.delete) {
                            const deleteQuery = `DELETE
                                                 FROM ${table}
                                                 WHERE id = ?
                                                   AND ts <= ?`;

                            await connection.execute(deleteQuery, [entry.id, date]);
                        }
                    });
                }),
            );
        }

        // Initialize your adapter here

        // Reset the connection indicator during startup

        /*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
        // await this.setObjectNotExistsAsync("testVariable", {
        //     type: "state",
        //     common: {
        //         name: "testVariable",
        //         type: "boolean",
        //         role: "indicator",
        //         read: true,
        //         write: true,
        //     },
        //     native: {},
        // });

        /*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
        // the variable testVariable is set to true as command (ack=false)
        // await this.setStateAsync("testVariable", true);
        //
        // // same thing, but the value is flagged "ack"
        // // ack should be always set to true if the value is received from or acknowledged from the target system
        // await this.setStateAsync("testVariable", { val: true, ack: true });
        //
        // // same thing, but the state is deleted after 30s (getState will return null afterwards)
        // await this.setStateAsync("testVariable", { val: true, ack: true, expire: 30 });
        //
        // // examples for the checkPassword/checkGroup functions
        // let result = await this.checkPasswordAsync("admin", "iobroker");
        // this.log.info("check user admin pw iobroker: " + result);
        //
        // result = await this.checkGroupAsync("admin", "admin");
        // this.log.info("check group user admin group admin: " + result);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback Callback
     */
    private onUnload(callback: () => void): void {
        try {
            this.scheduleJob.forEach((job) => job.cancel());
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

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
    // private onMessage(obj: ioBroker.Message): void {
    //     if (typeof obj === "object" && obj.message) {
    //         if (obj.command === "send") {
    //             // e.g. send email or pushover or whatever
    //             this.log.info("send command");

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    //         }
    //     }
    // }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new SqlDataShifter(options);
} else {
    // otherwise start the instance directly
    (() => new SqlDataShifter())();
}
