// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            password: string;
            user: string;
            ip: string;
            database: string;
            table: TableItem[];
            timeZone?: string;
            tableSizeCron: string;
            info: boolean;
            warning: number;
            error: number;
        }
    }
}

export interface TableItem {
    time: number; // Seconds
    schedule: string;
    id: string;
    tableFrom: string;
    tableTo: string;
    delete: boolean;
    unit?: string;
    operation: "avg" | "sum" | "dif" | "all";
    factor: number;
    active: boolean;
    writeZero: boolean;
    round: number; // 0 = no rounding
    retentionValue: number; // 0 = no retention
    retentionUnit: "hours" | "days" | "weeks" | "months" | "years";
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
