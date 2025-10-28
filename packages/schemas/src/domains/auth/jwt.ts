import { z } from 'zod/v4';

// JWT Audience values - matches jwt-signing.ts
const JWTAudience = z.enum(['catalyst:gateway', 'catalyst:datachannel']);

const jwtParseSuccess = z.object({
    valid: z.literal(true),
    entity: z.string(),
    claims: z.string().array(),
    jwtId: z.string(),
    audience: JWTAudience,
});

const jwtParseError = z.object({
    valid: z.literal(false),
    entity: z.literal(undefined),
    claims: z.string().array().length(0),
    error: z.string(),
});

export const JWTParsingResponseSchema = z.discriminatedUnion('valid', [jwtParseError, jwtParseSuccess]);
export type JWTParsingResponse = z.infer<typeof JWTParsingResponseSchema>;
