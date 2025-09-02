import { z } from 'zod/v4';

/**
 * Performance optimizations using Zod v4 features
 */

// Pre-compiled schemas for frequently used patterns
export const compiledSchemas = {
    // String validation patterns (cached for performance)
    email: z.string().email(),
    uuid: z.string().uuid(),
    url: z.string().url(),
    nonEmpty: z.string().min(1),

    // Numeric patterns
    positiveInt: z.number().int().positive(),
    timestamp: z.number().int().positive(),

    // Common object patterns
    id: z.string().min(1).max(100),
} as const;

// Lazy evaluation for potentially recursive schemas
export const createLazySchema = <T>(schemaFn: () => z.ZodType<T>): z.ZodLazy<z.ZodType<T>> => z.lazy(schemaFn);

// Performance-optimized union for status enums
export const createOptimizedUnion = (values: readonly [string, ...string[]]) => {
    // Zod v4 optimizes enum validation internally
    return z.enum(values);
};

// Readonly transformations for immutable data
export const readonlyTransform = <T>(schema: z.ZodType<T>) => schema.readonly();

// Note: Complex default handling removed for compatibility
// Use z.object({}).default() directly instead

// Simplified batch validation for arrays
export const batchValidate = async <T>(
    schema: z.ZodType<T>,
    items: unknown[]
): Promise<{
    successful: T[];
    failed: Array<{ index: number; error: z.ZodError; item: unknown }>;
}> => {
    const successful: T[] = [];
    const failed: Array<{ index: number; error: z.ZodError; item: unknown }> = [];

    for (let i = 0; i < items.length; i++) {
        try {
            const result = await schema.parseAsync(items[i]);
            successful.push(result);
        } catch (error) {
            failed.push({
                index: i,
                error: error as z.ZodError,
                item: items[i],
            });
        }
    }

    return { successful, failed };
};

// Schema preprocessing for better validation performance
export const preprocess = <T, U>(preprocessor: (input: unknown) => T, schema: z.ZodType<U>) =>
    z.preprocess(preprocessor, schema);

// Common preprocessing patterns
export const preprocessors = {
    // Trim strings automatically
    trimString: (input: unknown) => (typeof input === 'string' ? input.trim() : input),

    // Convert string numbers to actual numbers
    stringToNumber: (input: unknown) => {
        if (typeof input === 'string' && !isNaN(Number(input))) {
            return Number(input);
        }
        return input;
    },

    // Normalize boolean-like values
    normalizeBoolean: (input: unknown) => {
        if (typeof input === 'string') {
            const lower = input.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'no') return false;
        }
        return input;
    },

    // Convert ISO date strings to Date objects
    stringToDate: (input: unknown) => {
        if (typeof input === 'string' && !isNaN(Date.parse(input))) {
            return new Date(input);
        }
        return input;
    },
} as const;
