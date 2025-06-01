/*
 * Created with @iobroker/create-adapter v2.6.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import type { DBConfig, SqlIobrokerAdapterRow } from './types/types';
import { useConnection } from './connection';
import { addParamsToTableItem, calculateAverage, differenceResult, sumResult } from './lib/lib';
import type { Job } from 'node-schedule';
// eslint-disable-next-line no-duplicate-imports
import schedule from 'node-schedule';
import { createNewTable, getAllTables, removeOldData, saveData, saveDataArray, setTimeZone } from './app/querys';
import { getDatapointsTable } from './app/getTablesForFrontendUsage';
import { initTableSizes, tableSizeCron } from './app/tableSize';

export const dbConfig: DBConfig = {} as DBConfig;
export let _this: SqlDataShifter;

class SqlDataShifter extends utils.Adapter {
    private scheduleJob: Job[];

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'sql-data-shifter',
        });
        this.scheduleJob = [];
        this.on('ready', this.onReady.bind(this));
        // this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
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
            isConnectionSuccessful = await useConnection(async connection => {
                if (connection) {
                    await this.setState('info.connection', true, true);
                    return true;
                }
                this.log.error('Connection failed');
                return false;
            });
        } catch (e) {
            this.log.error(`Connection failed: ${JSON.stringify(e)}`);
            await this.setState('info.connection', false, true);
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
                await useConnection(async connection => {
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
                        this.log.debug(`No data found for ${entry.id} in ${entry.tableFrom}`);
                        return;
                    }

                    if (entry.operation === 'sum') {
                        const sum = sumResult(result) * entry.factor;
                        if (sum === 0 && !entry.writeZero) {
                            return;
                        }
                        await saveData(entry, date, sum);
                        await removeOldData(entry);
                    }

                    if (entry.operation === 'dif') {
                        const sum = differenceResult(result) * entry.factor;
                        if (sum === 0 && !entry.writeZero) {
                            return;
                        }
                        await saveData(entry, date, sum);
                        await removeOldData(entry);
                    }

                    if (entry.operation === 'avg') {
                        const average = calculateAverage(result) * entry.factor;
                        if (average === 0 && !entry.writeZero) {
                            return;
                        }
                        await saveData(entry, date, average);
                        await removeOldData(entry);
                    }

                    if (entry.operation === 'all') {
                        await saveDataArray(entry, result);
                        await removeOldData(entry);
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
    private onUnload(callback: () => void): void {
        try {
            this.scheduleJob.forEach(job => job.cancel());
            tableSizeCron?.cancel();
            callback();
        } catch (e) {
            console.error(e);
            callback();
        }
    }

    private async onMessage(obj: ioBroker.Message): Promise<void> {
        switch (obj.command) {
            case 'id': {
                const result = await getDatapointsTable();
                const options = result.map(item => ({
                    label: `${item.id} | ${item.name}`,
                    value: item.id,
                }));

                obj.callback && this.sendTo(obj.from, obj.command, options, obj.callback);
                break;
            }
            case 'tableFrom': {
                const tables = await getAllTables();
                const options = tables.map(item => ({
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
