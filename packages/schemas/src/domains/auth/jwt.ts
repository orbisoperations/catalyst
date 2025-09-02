import { z } from 'zod/v4';

const jwtParseSuccess = z.object({
    valid: z.literal(true),
    entity: z.string(),
    claims: z.string().array(),
    jwtId: z.string().optional(),
});

const jwtParseError = z.object({
    valid: z.literal(false),
    entity: z.literal(undefined),
    claims: z.string().array().length(0),
    error: z.string(),
});

export const JWTParsingResponse = z.discriminatedUnion('valid', [jwtParseError, jwtParseSuccess]);
export type JWTParsingResponse = z.infer<typeof JWTParsingResponse>;
