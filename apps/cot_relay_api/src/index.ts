// This file is intentionally written as if it all exists in the same context
// The abstraction is left to the reader to implement as necessary
import { createYoga } from 'graphql-yoga';
import SchemaBuilder from '@pothos/core';
import { Hono } from "hono";

// Generic typing for schema builder
export interface SchemaTypes {
  Objects: {
    Point: { lat: number; lon: number; hae: number };
    Unit: { uid: string; name: string; type: string };
    Event: { type: string; point: SchemaTypes['Objects']['Point']; unit: SchemaTypes['Objects']['Unit'] };
  };
}

const builder = new SchemaBuilder<SchemaTypes>({});

// Define a Point object type
builder.objectType('Point', {
  fields: (t) => ({
    lat: t.exposeFloat('lat', {}),
    lon: t.exposeFloat('lon', {}),
    hae: t.exposeFloat('hae', {}), // Height above ellipsoid
  }),
});

// Define a Unit object type
builder.objectType('Unit', {
  fields: (t) => ({
    uid: t.exposeString('uid', {}),
    name: t.exposeString('name', {}),
    type: t.exposeString('type', {}),
  }),
});

// Define an Event object type that includes Point and Unit
builder.objectType('Event', {
  fields: (t) => ({
    type: t.exposeString('type', {}),
    point: t.field({
      type: 'Point',
      resolve: () => ({
        lat: 34.2101,
        lon: -77.8868,
        hae: 30.48, // Example data
      }),
    }),
    unit: t.field({
      type: 'Unit',
      resolve: () => ({
        uid: "Unit123",
        name: "Alpha Team",
        type: "Infantry",
      }),
    }),
  }),
});

// Add a query field to get an event by type
builder.queryType({
  fields: (t) => ({
    event: t.field({
      type: 'Event',
      args: {
        type: t.arg({ type: 'String', required: true }),
      },
      resolve: (_, args) => ({
        // Dummy resolver for demonstration
        type: args.type,
        unit: {
          // Example data
          uid: "Unit123",
          name: "Alpha Team",
          type: "Infantry",
        },
        point: {
          lat: 34.2101,
          lon: -77.8868,
          hae: 30.48,
        },
      }),
    }),
  }),
});

import { XMLBuilder } from 'fast-xml-parser';

// Function to convert GraphQL JSON response to CoT XML format using fast-xml-parser
export function convertJsonToCotXml(json: any) {
  // Constructing JSON object to match XML structure
  const jsonObj = {
    Event: {
      '@type': json.type,
      Point: {
        '@lat': json.point.lat.toString(),
        '@lon': json.point.lon.toString(),
        '@hae': json.point.hae.toString(),
      },
      Unit: {
        '@uid': json.unit.uid,
        '@name': json.unit.name,
        '@type': json.unit.type,
      },
    },
  };

  const builder = new XMLBuilder();
  return builder.build(jsonObj);
}
// Example of starting the server, adjusted as necessary for your environment
// server.start();

// Note: Integration of the `convertJsonToCotXml` function within your GraphQL server logic,
// such as part of a custom resolver or middleware to convert and return XML responses,
// is left as an exercise for the reader.


type Bindings = {
  NODE_ENV: string;
  LOGGING: string;
  // ENVs here
};


// Compile the schema above
export const schema = builder.toSchema({});

// console.log("schema", schema)


// save the schema to a file
// import fs from "fs";
// fs.writeFileSync("schema.graphql", schema);
// console.log("schema saved to schema.graphql")


//
console.log("");
// console.log("cot-gql://", schema)


const app = new Hono<{ Bindings: Bindings }>();

export function doYoga(reqRaw: any, env: any, executionCtx: any) {
  return createYoga<Bindings & ExecutionContext>({
    logging: "info",
    // `NODE_ENV` is under `c.env`
    maskedErrors: env.NODE_ENV == "production",
    // Keep as / so you're using just the hono route
    graphqlEndpoint: "/",
    schema: schema // feed in your schema here normally
  }).fetch(reqRaw, env, executionCtx)
}

app.on(["POST", "GET"], "/", async (c) =>
  doYoga(c.req, c.env, c.executionCtx)
);

export default app;