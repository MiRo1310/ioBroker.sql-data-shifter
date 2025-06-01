import type { SqlIobrokerAdapterRow } from '../types/types';
import type { TableItem } from './adapter-config';

export function calculateAverage(rows: SqlIobrokerAdapterRow[]): number {
    let sum = 0;
    rows.forEach(row => {
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

    return tableWithMoreParams.map(item => {
        return { ...item, oldTimestamp: 0 };
    });
};

export const isDefined = (
    value?: string | number | boolean | null | object,
): value is string | number | boolean | object => {
    return value !== undefined && value !== null;
};

export const roundValue = <T>(entry: TableItem, val?: T): T | undefined => {
    if (typeof val === 'string' || entry.round === 0 || typeof val !== 'number') {
        return val;
    }
    return Number(val.toFixed(entry.round)) as T;
};

export const toJSON = (val: object): string => {
    return JSON.stringify(val, null, 2);
};

export const getRetentionTime = (entry: TableItem): number => {
    if (entry.retentionValue === 0) {
        return 0;
    }
    const now = Date.now();
    switch (entry.retentionUnit) {
        case 'hours':
            return now - entry.retentionValue * 60 * 60 * 1000;
        case 'days':
            return now - entry.retentionValue * 24 * 60 * 60 * 1000;
        case 'weeks':
            return now - entry.retentionValue * 7 * 24 * 60 * 60 * 1000;
        case 'months':
            return now - entry.retentionValue * 30 * 24 * 60 * 60 * 1000; // Approximation
        case 'years':
            return now - entry.retentionValue * 365 * 24 * 60 * 60 * 1000; // Approximation
        default:
            return now;
    }
};
