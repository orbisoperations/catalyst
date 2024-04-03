import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type DataChannel = {
    id: string;
    accessSwitch: number | null;
    name: string;
    endpoint: string;
    description: string | null;
    creatorOrganization: string;
};
export type DB = {
    DataChannel: DataChannel;
};
