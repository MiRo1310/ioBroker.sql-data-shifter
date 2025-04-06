/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";
import type { DBConfig, SqlIobrokerAdapterRow } from "./types/types";
import { useConnection } from "./connection";
import { addParamsToTableItem, calculateAverage, differenceResult, sumResult } from "./lib/lib";
import type { Job } from "node-schedule";
// eslint-disable-next-line no-duplicate-imports
import schedule from "node-schedule";
import { createNewTable, getAllTables, saveData, saveDataArray, setTimeZone } from "./app/querys";
import { getDatapointsTable } from "./app/getTablesForFrontendUsage";
import { initTableSizes, tableSizeCron } from "./app/tableSize";

export const dbConfig: DBConfig = {} as DBConfig;
export let _this: SqlDataShifter;

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
        this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        const { user, database, password, ip } = this.config;

        if (!user || !password || !database) {
            return;
        }
        _this = this;

        dbConfig.host = ip;
        dbConfig.user = user;
        dbConfig.password = password;
        dbConfig.database = database;
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
            this.log.error(`Connection failed: ${JSON.stringify(e)}`);
            await this.setState("info.connection", false, true);
            return;
        }

        if (!isConnectionSuccessful) {
            return;
        }

        await setTimeZone(this.config.timeZone);
        await initTableSizes(this.config.tableSizeCron);

        const tableObject = addParamsToTableItem(this.config.table);

        for (const entry of tableObject) {
            if (!entry.active) {
                continue;
            }
            await createNewTable(entry.tableTo);

            const timeInMilliseconds = entry.time * 1000;

            const job = schedule.scheduleJob(entry.schedule, async () => {
                await useConnection(async (connection) => {
                    const date = Date.now();
                    this.log.debug(
                        `Schedule job for id: ${entry.id} started, from ${entry.tableFrom} to ${entry.tableTo}`,
                    );

                    const selectQuery = `SELECT *
                                         from ${entry.tableFrom}
                                         WHERE id = ?
                                           AND ts <= ?
                                           AND ts > ?`;

                    const [rows] = await connection.execute(selectQuery, [
                        entry.id,
                        date,
                        entry.oldTimestamp || date - timeInMilliseconds,
                    ]);

                    this.log.debug(`Date: ${date}, Old date: ${entry.oldTimestamp}`);

                    this.log.debug(`Rows: ${JSON.stringify(rows)}`);
                    entry.oldTimestamp = date;
                    const result = rows as SqlIobrokerAdapterRow[];

                    if (result.length === 0) {
                        if (entry.writeZero) {
                            await saveData(entry, date, 0);
                        }
                        this.log.debug(`No data found for ${entry.id} in ${entry.tableFrom}`);
                        return;
                    }

                    if (entry.operation === "sum") {
                        const sum = sumResult(result) * entry.factor;
                        if (sum === 0 && !entry.writeZero) {
                            return;
                        }
                        await saveData(entry, date, sum);
                    }

                    if (entry.operation === "dif") {
                        const sum = differenceResult(result) * entry.factor;
                        if (sum === 0 && !entry.writeZero) {
                            return;
                        }
                        await saveData(entry, date, sum);
                    }

                    if (entry.operation === "avg") {
                        const average = calculateAverage(result) * entry.factor;
                        if (average === 0 && !entry.writeZero) {
                            return;
                        }
                        await saveData(entry, date, average);
                    }

                    if (entry.operation === "all") {
                        await saveDataArray(entry, result);
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
            tableSizeCron?.cancel();
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
    private async onMessage(obj: ioBroker.Message): Promise<void> {
        switch (obj.command) {
            case "id": {
                const result = await getDatapointsTable();
                const options = result.map((item) => ({
                    label: `${item.id} | ${item.name}`,
                    value: item.id,
                }));

                obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
                break;
            }
            case "tableFrom": {
                const tables = await getAllTables();
                const options = tables.map((item) => ({
                    label: item,
                    value: item,
                }));
                obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
            }
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new SqlDataShifter(options);
} else {
    // otherwise start the instance directly
    (() => new SqlDataShifter())();
}
