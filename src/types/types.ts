export interface DBConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}

export interface SqlIobrokerAdapterRow {
    id: number;
    ts: number;
    val: number | null | string;
    ack: number;
    _from: number;
    q: number;
}

export interface DatapointsTable {
    id: number;
    name: string;
    type: number;
}

export interface TableSize {
    table: string;
    'size_(MB)': number;
}
