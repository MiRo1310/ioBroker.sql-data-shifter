import { useConnection } from "../connection";
import type { TableItem } from "../lib/adapter-config";
import type { SqlIobrokerAdapterRow } from "../types/types";
import { isDefined, roundValue } from "../lib/lib";

export async function createNewTable(table: string): Promise<void> {
    return useConnection(async (connection) => {
        const query = `
            CREATE TABLE IF NOT EXISTS ${table}
            (
                id
                    INT,
                ts
                    BIGINT,
                val
                    DOUBLE,
                unit
                    VARCHAR(50),
                createdAt
                    TIMESTAMP
                    DEFAULT
                        CURRENT_TIMESTAMP
            )`;
        await connection.query(query);
    });
}

export const saveData = async (entry: TableItem, date: number, val: number): Promise<void> => {
    return useConnection(async (connection) => {
        const saveQuery = `INSERT INTO ${entry.tableTo} (id, ts, val, unit)
                           VALUES (?, ?, ?, ?)`;
        if (!isDefined(val)) {
            return;
        }
        await connection.execute(saveQuery, [entry.id, date, roundValue(entry, val), entry.unit ?? ""]);
    });
};

export const saveDataArray = async (entry: TableItem, table: SqlIobrokerAdapterRow[]): Promise<void> => {
    return useConnection(async (connection) => {
        const saveQuery = `INSERT INTO ${entry.tableTo} (id, ts, val, unit)
                           VALUES (?, ?, ?, ?)`;

        for (const row of table) {
            if (!isDefined(row.val)) {
                continue;
            }
            if (row.val === 0 && !entry.writeZero) {
                continue;
            }
            await connection.execute(saveQuery, [entry.id, row.ts, roundValue(entry, row.val), entry.unit ?? ""]);
        }
    });
};

export const getAllTables = async (): Promise<string[]> => {
    return useConnection(async (connection) => {
        const [rows] = await connection.query("SHOW TABLES");

        const result = rows as Record<string, string>[];

        return result.map((row): string => {
            return Object.keys(row).map((key) => row[key])[0];
        });
    });
};

export const setTimeZone = async (timeZone?: string): Promise<void> => {
    if (timeZone === "0" || !timeZone) {
        return;
    }
    return await useConnection(async (connection) => {
        const query = `SET time_zone = ?`;
        await connection.query(query, [timeZone]);
    });
};
