/* eslint-disable */
import type { Prisma, DataChannel } from "@prisma/client";
export default interface PrismaTypes {
    DataChannel: {
        Name: "DataChannel";
        Shape: DataChannel;
        Include: never;
        Select: Prisma.DataChannelSelect;
        OrderBy: Prisma.DataChannelOrderByWithRelationInput;
        WhereUnique: Prisma.DataChannelWhereUniqueInput;
        Where: Prisma.DataChannelWhereInput;
        Create: {};
        Update: {};
        RelationName: never;
        ListRelations: never;
        Relations: {};
    };
}