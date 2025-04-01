import { useConnection } from "../connection";
import type { TableItem } from "./adapter-config";
import type { SqlIobrokerAdapterRow } from "../types/types";

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
                VARCHAR
            (
                50
            ),
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

        await connection.execute(saveQuery, [entry.id, date, val, entry.unit ?? ""]);
    });
};

export const saveDataArray = async (entry: TableItem, table: SqlIobrokerAdapterRow[]): Promise<void> => {
    return useConnection(async (connection) => {
        const saveQuery = `INSERT INTO ${entry.tableTo} (id, ts, val, unit)
                           VALUES (?, ?, ?, ?)`;

        for (const row of table) {
            await connection.execute(saveQuery, [entry.id, row.ts, row.val, entry.unit ?? ""]);
        }
    });
};
