import { useConnection } from "../connection";
import type { JsonConfigTable } from "../lib/adapter-config";
import type { SqlIobrokerAdapterRow, TableSize } from "../types/types";
import { isDefined, roundValue, toLocalTime , getRetentionTime} from "../lib/lib";

export async function createNewTable(table: string): Promise<void> {
    return useConnection(async connection => {
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
            )`;
        await connection.query(query);
    });
}

export const removeOldData = async (entry: JsonConfigTable): Promise<void> => {
    const timestamp = getRetentionTime(entry);
    if (timestamp === 0) {
        return; // No retention, nothing to delete
    }
    return useConnection(async connection => {
        const deleteQuery = `DELETE
                             FROM ${entry.tableTo}
                             WHERE ts <= ?`;
        await connection.execute(deleteQuery, [timestamp]);
    });
};

export const saveData = async (entry: JsonConfigTable, date: number, val: number): Promise<void> => {
    return useConnection(async connection => {
        const saveQuery = `INSERT INTO ${entry.tableTo} (id, ts, val, unit)
                           VALUES (?, ?, ?, ?)`;
export const saveData = async (entry: JsonConfigTable, date: number, val: number): Promise<void> => {
    // TODO zusammenfassen
    return useConnection(async (connection) => {
        const saveQuery = `INSERT INTO ${entry.tableTo} (id, ts, val, unit, createdAt)
                           VALUES (?, ?, ?, ?, ?)`;
        if (!isDefined(val)) {
            return;
        }

        await connection.execute(saveQuery, [
            entry.id,
            date,
            roundValue(entry, val),
            entry.unit ?? "",
            toLocalTime(date),
        ]);
    });
};

export const saveDataArray = async (
    jsonConfigTable: JsonConfigTable,
    table: Omit<SqlIobrokerAdapterRow, "ack" | "q" | "_from">[],
): Promise<void> => {
    const { tableTo, writeZero, unit, id } = jsonConfigTable;
    return useConnection(async (connection) => {
        const saveQuery = `INSERT INTO ${tableTo} (id, ts, val, unit, createdAt)
                           VALUES (?, ?, ?, ?, ?)`;

        for (const row of table) {
            if (!isDefined(row.val)) {
                continue;
            }
            if (row.val === 0 && !writeZero) {
                continue;
            }
            await connection.execute(saveQuery, [
                id,
                row.ts,
                roundValue(jsonConfigTable, row.val),
                unit ?? "",
                toLocalTime(row.ts),
            ]);
        }
    });
};

export const saveData = async (entry: JsonConfigTable, date: number, val: number): Promise<void> => {
    await saveDataArray(entry, [{ ts: date, val, id: Number(entry.id) }]);
};

export const getAllTables = async (): Promise<string[]> => {
    return useConnection(async connection => {
        const [rows] = await connection.query('SHOW TABLES');

        const result = rows as Record<string, string>[];

        return result.map((row): string => {
            return Object.keys(row).map(key => row[key])[0];
        });
    });
};

export const setTimeZone = async (timeZone?: string): Promise<void> => {
    if (timeZone === '0' || !timeZone) {
        return;
    }
    return await useConnection(async connection => {
        const query = `SET time_zone = ?`;
        await connection.query(query, timeZone);
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
