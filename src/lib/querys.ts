import type { SqlTables } from "../types/types";
import { useConnection } from "../connection";

export async function createNewTable(table: SqlTables): Promise<void> {
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
                createdAt
                TIMESTAMP
                DEFAULT
                CURRENT_TIMESTAMP
            )`;
        await connection.query(query);
    });
}
