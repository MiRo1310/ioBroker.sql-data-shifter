export interface DBConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}

export type SqlTables = IobrokerSQLAdapterTables | CustomTables;
type IobrokerSQLAdapterTables = "ts_string" | "ts_number" | "ts_counter" | "ts_bool" | "sources" | "datapoints";
type CustomTables = "IobrokerPvPowerBig_5min" | "IobrokerPvPowerSmall_5min";

export interface SqlNumberTable {
    id: number;
    ts: number;
    val: number;
    ack: number;
    _from: number;
    q: number;
}

export interface Ids {
    id: number;
    table: SqlTables;
}
