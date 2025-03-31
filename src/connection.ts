import mysql from "mysql2/promise";
import type { DBConfig } from "./types/types";

let dbConfig: DBConfig = {} as DBConfig;

export function setDBConfig(config: DBConfig): void {
    dbConfig = config;
}

export async function useConnection<T>(cb: (connection: mysql.Connection) => Promise<T>): Promise<T> {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log(`Connected to database: ${dbConfig.host}`);
        return await cb(connection);
    } catch (err) {
        // FIXME Add this.log.error
        console.error(err);
        throw new Error("Error with database operation");
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}
