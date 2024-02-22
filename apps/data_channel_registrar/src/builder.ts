import SchemaBuilder from '@pothos/core';
import PrismaPlugin from "@pothos/plugin-prisma";
import { prisma } from './db'
// @ts-ignore
import type PrismaTypes from "@pothos/plugin-prisma/generated";
import { D1Database} from "@cloudflare/workers-types"
import { DateResolver } from "graphql-scalars";

export const builder = new SchemaBuilder<{
    PrismaTypes: PrismaTypes;
    Scalars: {
        Date: { Input: Date; Output: Date };
    };
    Context: {
        env: { DB: D1Database }
    };

}>({
    plugins: [PrismaPlugin],
    prisma: {
        client: prisma,
    },
});

builder.addScalarType('Date', DateResolver, {});

builder.queryType({});
// builder.mutationType({});
