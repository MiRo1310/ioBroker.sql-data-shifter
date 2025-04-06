import { getAllTables, getTableSize } from "./querys";
import type { TableSize } from "../types/types";
import { _this, dbConfig } from "../main";
import type { Job } from "node-schedule";
// eslint-disable-next-line no-duplicate-imports
import schedule from "node-schedule";
import { datapoints } from "./datapoints";
import { toJSON } from "../lib/lib";

const getTableSizes = async (): Promise<TableSize[]> => {
    const tables = await getAllTables();
    const tableSizes: TableSize[] = [];
    await Promise.all(
        tables.map(async (table) => {
            tableSizes.push(await getTableSize(dbConfig.database, table));
        }),
    );
    return tableSizes;
};

export let tableSizeCron: Job | undefined = undefined;
export const initTableSizes = async (cron: string): Promise<void> => {
    if (cron === "0") {
        return;
    }
    await setTableSize(true);

    tableSizeCron = schedule.scheduleJob(cron, async () => {
        await setTableSize();
    });
};

async function setTableSize(init?: boolean): Promise<void> {
    const tableSizes = await getTableSizes();

    if (init) {
        await createDatapoints(tableSizes);
    }
    await _this.setState(datapoints.tableSize, toJSON(tableSizes), true);

    for (const tableSize of tableSizes) {
        checkSizes(tableSize);
        await _this.setState(`${datapoints.tableSizeFolder}.${tableSize.table}`, Number(tableSize["size_(MB)"]), true);
    }
}

function checkSizes(tableSize: TableSize): void {
    const { info, warning, error } = _this.config;

    if (error && tableSize["size_(MB)"] >= error) {
        _this.log.error(`Table ${tableSize.table} is larger than error setting ${tableSize["size_(MB)"]} MB`);
        return;
    }

    if (warning && tableSize["size_(MB)"] >= warning) {
        _this.log.warn(`Table ${tableSize.table} is larger than warning setting: ${tableSize["size_(MB)"]} MB`);
        return;
    }

    if (info) {
        _this.log.info(`Size of table ${tableSize.table} is ${tableSize["size_(MB)"]} MB`);
        return;
    }
}

async function createDatapoints(tableSizes: TableSize[]): Promise<void> {
    await _this.setObjectNotExistsAsync(datapoints.tableSize, {
        type: "state",
        common: {
            name: "tableSizeJson",
            type: "string",
            role: "json",
            read: true,
            write: false,
        },
        native: {},
    });
    for (const tableSize of tableSizes) {
        await _this.setObjectNotExistsAsync(`${datapoints.tableSizeFolder}.${tableSize.table}`, {
            type: "state",
            common: {
                name: tableSize.table,
                type: "number",
                role: "indicator",
                read: true,
                write: false,
                unit: "MB",
            },
            native: {},
        });
    }
}
