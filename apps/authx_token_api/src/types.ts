import SchemaBuilder from '@pothos/core';
import {DurableObjectNamespace} from "@cloudflare/workers-types"

export const builder = new SchemaBuilder<{
    Context: {
        env: { DB: DurableObjectNamespace }
    };
}>({});