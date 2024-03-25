import type { CodegenConfig } from '@graphql-codegen/cli';
import { printSchema } from 'graphql';
import  schema  from './src/pothos/schemaBuilder';

const config: CodegenConfig = {
    schema: printSchema(schema),
    // documents: ['src/**/*.tsx'],
    generates: {
        './generated/gql/': {
            preset: 'client',
            plugins: [],
        },
        'schema.graphql': {
            plugins: ['schema-ast'],
        },
    },
};

export default config;
