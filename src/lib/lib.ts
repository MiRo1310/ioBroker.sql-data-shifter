import type { SqlIobrokerAdapterRow } from "../types/types";
import type { TableItem } from "./adapter-config";

export function calculateAverage(rows: SqlIobrokerAdapterRow[]): number {
    let sum = 0;
    rows.forEach((row) => {
        sum += Number(row.val);
    });
    return sum / rows.length;
}

export function sumResult(rows: SqlIobrokerAdapterRow[]): number {
    return rows.reduce((acc, row) => {
        return acc + Number(row.val);
    }, 0);
}

export function differenceResult(rows: SqlIobrokerAdapterRow[]): number {
    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];

    if (!firstRow?.val || !lastRow?.val) {
        return 0;
    }
    return Number(lastRow.val) - Number(firstRow.val);
}

export const addParamsToTableItem = (table: TableItem[]): (TableItem & { oldTimestamp?: number })[] => {
    const tableWithMoreParams: (TableItem & { oldTimestamp?: number })[] = table;

    return tableWithMoreParams.map((item) => {
        return { ...item, oldTimestamp: 0 };
    });
};

export const isDefined = (
    value?: string | number | boolean | null | object,
): value is string | number | boolean | object => {
    return value !== undefined && value !== null;
};

export const roundValue = <T>(entry: TableItem, val?: T): T | undefined => {
    if (typeof val === "string" || entry.round === 0 || typeof val !== "number") {
        return val;
    }
    return Number(val.toFixed(entry.round)) as T;
};

export const toJSON = (val: object): string => {
    return JSON.stringify(val, null, 2);
};
