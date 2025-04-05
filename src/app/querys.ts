import { useConnection } from "../connection";
import type { TableItem } from "../lib/adapter-config";
import type { SqlIobrokerAdapterRow, TableSize } from "../types/types";
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

export const getTableSize = async (database: string, table: string): Promise<TableSize> => {
    return await useConnection(async (connection): Promise<TableSize> => {
        const [rows] = await connection.execute(
            `SELECT table_name                                             AS "table",
                    round(((data_length + index_length) / 1024 / 1024), 2) AS "size_(MB)"
             FROM information_schema.TABLES
             WHERE table_schema = ?
               AND table_name = ?;
            `,
            [database, table],
        );

        if ((rows as TableSize[]).length) {
            return (rows as TableSize[])[0];
        }
        throw new Error(`Tabelle ${table} nicht gefunden.`);
    });
};
