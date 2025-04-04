import { useConnection } from "../connection";
import type { DatapointsTable } from "../types/types";

const getDatapoints = async () => {
    return await useConnection(async (connection) => {
        const query = `SELECT *
                       FROM datapoints`;
        const [rows] = await connection.query(query);
        return rows as DatapointsTable[];
    });
};
