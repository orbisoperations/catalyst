/**
 * Shared test helper utilities
 * Type guards and assertion helpers for tests
 */

/**
 * Checks if a value is within a specified range (inclusive)
 *
 * @param value - The value to check
 * @param min - The minimum value (inclusive)
 * @param max - The maximum value (inclusive)
 * @returns true if value is within range, false otherwise
 */
export function isWithinRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

/**
 * Type guard to assert and narrow success responses
 * Use this after expect(response.success).toBe(true) to help TypeScript narrow the type
 *
 * @param response - The response object to check
 * @throws Error if response is not successful
 */
export function assertSuccess<T extends { success: boolean }>(
    response: T
): asserts response is Extract<T, { success: true }> {
    if (!response.success) {
        throw new Error('Expected success response');
    }
}

/**
 * Type guard to assert and narrow valid responses
 * Use this after expect(response.valid).toBe(true) to help TypeScript narrow the type
 *
 * @param response - The response object to check
 * @throws Error if response is not valid
 */
export function assertValid<T extends { valid: boolean }>(
    response: T
): asserts response is Extract<T, { valid: true }> {
    if (!response.valid) {
        throw new Error('Expected valid response');
    }
}
