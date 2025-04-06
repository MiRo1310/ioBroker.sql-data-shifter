import mysql from "mysql2/promise";
import { _this, dbConfig } from "./main";

export async function useConnection<T>(cb: (connection: mysql.Connection) => Promise<T>): Promise<T> {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        return await cb(connection);
    } catch (err) {
        _this.log.error(`Error connection: ${JSON.stringify(err)}`);
        throw new Error("Error with database operation");
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}
