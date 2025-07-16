# Drizzle ORM + GraphQL + Cloudflare D1

This project sets up a GraphQL server using Drizzle ORM with a Cloudflare D1 database backend.

## Setup

1.  Install dependencies:

    ```bash
    bun install
    ```

2.  Create a D1 database. You can do this locally for development.

    ```bash
    wrangler d1 create jobs-db
    ```

    This will output a `database_id`. Update `wrangler.toml` with this ID. For the `preview_database_id`, you can create another one or reuse the same one for simplicity in local development.

3.  Apply database schema:

    ```bash
    bun run db:push
    ```

4.  Run the development server:
    ```bash
    bun run dev
    ```

The GraphQL endpoint will be available at `http://localhost:8787/graphql`. You can use a tool like GraphiQL to interact with it.
