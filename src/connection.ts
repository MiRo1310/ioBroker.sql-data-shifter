import mysql from "mysql2/promise";
import { dbConfig } from "./main";

export async function useConnection<T>(cb: (connection: mysql.Connection) => Promise<T>): Promise<T> {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

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
