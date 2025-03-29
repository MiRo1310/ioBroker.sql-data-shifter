import { SqlNumberTable } from "../types/types";

export function calculateAverage(rows: SqlNumberTable[]): number {
    let sum = 0;
    rows.forEach((row) => {
        sum += row.val;
    });
    return sum / rows.length;
}
