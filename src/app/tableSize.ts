import { getAllTables, getTableSize } from "./querys";
import type { TableSize } from "../types/types";
import { dbConfig } from "../main";

const getTableSizes = async (): Promise<void> => {
    const tables = await getAllTables();
    const tableSizes: TableSize[] = [];
    await Promise.all(
        tables.map(async (table) => {
            tableSizes.push(await getTableSize(dbConfig.database, table));
        }),
    );
    console.log(JSON.stringify(tableSizes));
};
