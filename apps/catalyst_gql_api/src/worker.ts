import {Hono} from "hono";
import {createYoga} from "graphql-yoga";
import schemaBuilder from "./pothos/schemaBuilder";
import {CatalystKyselySchema, CatalystKyselyTypes} from "@catalyst/schema";
import {Kysely} from "kysely";
import {D1Dialect} from "kysely-d1";
const app = new Hono<{ Bindings: Env }>();

export type Env = & Record<string, string> & {
  APP_DB: D1Database;
};


app.use("/graphql", async (c) => {


  const db = new Kysely<CatalystKyselySchema>({
    dialect: new D1Dialect({database: c.env.APP_DB})
  });


  const yoga = createYoga({
    schema: schemaBuilder,
    context: {
      ...c,
      db: db,
    },
  });
  return yoga.handle(c.req.raw as Request);
});



export default app;
