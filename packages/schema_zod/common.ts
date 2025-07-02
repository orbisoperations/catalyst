import { z } from 'zod';

export const BaseError = z.object({
    success: z.literal(false),
    error: z.string(),
});

export type BaseError = z.infer<typeof BaseError>;

export const DEFAULT_STANDARD_DURATIONS = {
    MS: 1,
    S: 1 * 1000,
    M: 1 * 1000 * 60,
    H: 1 * 1000 * 60 * 60,
    D: 1 * 1000 * 60 * 60 * 24,
    W: 1 * 1000 * 60 * 60 * 24 * 7,
    MONTH: 1 * 1000 * 60 * 60 * 24 * 30,
    Y: 1 * 1000 * 60 * 60 * 24 * 365,
};
