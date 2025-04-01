// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            password: string;
            user: string;
            ip: string;
            database: string;
            table: TableItem[]
        }
    }
}

export interface TableItem {
    time: number; // Sekunden
    id: string;
    tableFrom: string;
    tableTo: string;
    delete: boolean;
    unit?: string
    operation: "avg" | "sum" | "dif" | "all";
    factor: number;
    active: boolean;
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
