# @catalyst/schema_zod

Runtime-validated schemas and type inference for every Catalyst app.

## Motivation

- Strong type-safety at compile-time **and** runtime validation.
- Single source of truth – all workers, UI and tests import from here.
- Consistent success / error patterns via helper utilities.
- Easy path toward OpenAPI JSON Schema generation later.

## Package layout

```
├── helpers/
│   ├── result.ts          # ErrorInfo, ResultError, defineResult()
│   └── errors.ts          # formatZodError()
├── entities/
│   ├── data_channel.ts
│   ├── user.ts
│   ├── org_invite.ts
│   ├── token.ts
│   ├── issued_jwt_registry.ts
│   ├── jwt_signing.ts
│   ├── data_channel_access.ts
│   ├── jwt_rotate.ts
│   └── permission.ts
├── index.ts               # barrel exports (legacy + v2)
└── …
```

## Quick usage

```ts
import { Entities, Helpers } from '@catalyst/schema_zod';

// Validate incoming JSON against the DataChannel schema
const channel = Entities.DataChannel.parse(req.json());

// Wrap a business object in the standard envelope
const response = Entities.DataChannelResult.parse({
    success: true,
    data: channel,
});

// or build dynamically
const MyResult = Helpers.defineResult(Entities.User);
```

## Migration guide

1. Replace imports from `schema_zod/types` or `core_entities.ts` with
   `@catalyst/schema_zod` barrel exports.
2. Swap manual success/error unions for `defineResult()`.
3. Handle `formatZodError(err)` anywhere you catch a `ZodError`.

Legacy exports remain for now but will be removed after downstream apps migrate.

---

Released under the MIT License.
