export interface DBConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}

export interface SqlIobrokerAdapterRow {
    id: number;
    ts: number;
    val: number;
    ack: number;
    _from: number;
    q: number;
}
