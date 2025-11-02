import { z } from 'zod/v4';

/**
 * Security-focused validation utilities for input sanitization
 */

// Common patterns for security validation
const HTML_PATTERN = /<[^>]*>/g;
const SCRIPT_PATTERN = /<script[^>]*>.*?<\/script\s*>/gi;
// Match whole SQL keywords only (avoid matching substrings like "Updated")
const SQL_INJECTION_PATTERN = /\b(union|select|insert|update|delete|drop|create|alter|exec(?:ute)?)\b/i;

/**
 * Sanitized string schema that prevents common injection attacks
 */
export const sanitizedString = (minLength: number = 1, maxLength: number = 255) =>
    z
        .string()
        .min(minLength, `String must be at least ${minLength} characters`)
        .max(maxLength, `String must be no more than ${maxLength} characters`)
        .trim()
        .refine((val) => !HTML_PATTERN.test(val), 'Input cannot contain HTML tags')
        .refine((val) => !SCRIPT_PATTERN.test(val), 'Input cannot contain script tags')
        .refine((val) => !SQL_INJECTION_PATTERN.test(val), 'Input contains potentially dangerous SQL keywords');

/**
 * Safe message string for user-generated content
 */
export const safeMessage = () => sanitizedString(1, 1000);

/**
 * Safe name string for display names
 */
export const safeName = () =>
    z
        .string()
        .min(1, 'Channel name is required')
        .max(64, 'Channel name must be 64 characters or less')
        .trim()
        .refine((val) => val.length > 0, 'A channel name is required')
        .refine((val) => !/^\s+$/.test(val), 'Channel name cannot be only whitespace')
        .refine((val) => !HTML_PATTERN.test(val), 'Channel name cannot contain HTML tags')
        .refine((val) => !SCRIPT_PATTERN.test(val), 'Channel name cannot contain script tags')
        .refine((val) => !SQL_INJECTION_PATTERN.test(val), 'Channel name contains potentially dangerous SQL keywords')
        .regex(/^[a-zA-Z0-9\s_-]+$/, 'Only letters, numbers, and standard symbols are allowed');

/**
 * Safe description string for longer text content
 */
export const safeDescription = () => sanitizedString(1, 500);

/**
 * Positive timestamp validation
 */
export const timestamp = () =>
    z
        .number()
        .int('Timestamp must be an integer')
        .positive('Timestamp must be positive')
        .max(
            Date.now() + 86400 * 365 * 10 * 1000, // 10 years from now in milliseconds
            'Timestamp cannot be more than 10 years in the future'
        );

/**
 * Future date validation (for expiry dates)
 */
export const futureDate = () =>
    z
        .date()
        .refine((date) => date > new Date(), 'Date must be in the future')
        .refine(
            (date) => date.getTime() < Date.now() + 86400 * 365 * 10 * 1000, // 10 years from now
            'Date cannot be more than 10 years in the future'
        );

/**
 * Rate limiting helper - validates array length
 */
export const limitedArray = <T>(schema: z.ZodType<T>, maxItems: number = 50) =>
    z.array(schema).max(maxItems, `Maximum ${maxItems} items allowed`);

/**
 * Safe URL validation with protocol restrictions
 */
export const safeUrl = () =>
    z
        .string()
        .url('Must be a valid URL')
        .refine((url) => url.startsWith('https://') || url.startsWith('http://'), 'URL must use HTTP or HTTPS protocol')
        .refine((url) => !url.includes('javascript:'), 'JavaScript URLs are not allowed')
        .refine((url) => !url.includes('data:'), 'Data URLs are not allowed');
