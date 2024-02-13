import SchemaBuilder from '@pothos/core';
import PrismaPlugin from "@pothos/plugin-prisma";
import type PrismaTypes from "@pothos/plugin-prisma/generated";
import { prisma } from "./db";

import { DateResolver } from "graphql-scalars";

export const builder = new SchemaBuilder<{
    PrismaTypes: PrismaTypes;
    Scalars: {
        Date: { Input: Date; Output: Date };
    };
    Context: {
        D0_NAMESPACE: string
    };

}>({
    plugins: [PrismaPlugin],
    prisma: {
        client: prisma,
    },
});

builder.addScalarType('Date', DateResolver, {});

builder.queryType({});
builder.mutationType({});
