import type { SqlNumberTable } from "../types/types";

export function calculateAverage(rows: SqlNumberTable[]): number {
    let sum = 0;
    rows.forEach((row) => {
        sum += row.val;
    });
    return sum / rows.length;
}

export function sumResult(rows: SqlNumberTable[]): number {
    return rows.reduce((acc, row) => {
        return acc + row.val;
    }, 0);
}

export function differenceResult(rows: SqlNumberTable[]): number {
    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];

    if (!firstRow?.val || !lastRow?.val) {
        return 0;
    }
    return lastRow.val - firstRow.val;
}
