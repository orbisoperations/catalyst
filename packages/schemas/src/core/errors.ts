/**
 * Typed error classes for Catalyst applications
 *
 * These errors provide structured error information that can be easily
 * serialized and transmitted across service boundaries.
 */

/**
 * Base error class for all Catalyst errors
 */
export class CatalystError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'CatalystError';

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (
            'captureStackTrace' in Error &&
            typeof (Error as { captureStackTrace?: unknown }).captureStackTrace === 'function'
        ) {
            (
                Error as {
                    captureStackTrace: (target: object, constructor: new (...args: unknown[]) => unknown) => void;
                }
            ).captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert error to plain object for serialization
     */
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
            name: this.name,
        };
    }
}

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends CatalystError {
    constructor(resource: string, identifier?: string) {
        const message = identifier ? `${resource} '${identifier}' not found` : `${resource} not found`;
        super('NOT_FOUND', message, { resource, identifier });
    }
}

/**
 * Error thrown when an invite is not found
 */
export class InviteNotFoundError extends CatalystError {
    constructor(inviteId?: string) {
        const message = inviteId ? `Invite '${inviteId}' not found` : 'Invite not found';
        super('INVITE_NOT_FOUND', message, { resource: 'Invite', identifier: inviteId });
    }
}

/**
 * Error thrown when authentication credentials are missing or invalid
 */
export class UnauthorizedError extends CatalystError {
    constructor(message = 'No verifiable credential found') {
        super('UNAUTHORIZED', message);
    }
}

/**
 * Error thrown when a user is invalid or not found
 */
export class InvalidUserError extends CatalystError {
    constructor(message = 'Invalid or non-existent user') {
        super('INVALID_USER', message);
    }
}

/**
 * Error thrown when a user lacks necessary permissions
 */
export class PermissionDeniedError extends CatalystError {
    constructor(action?: string) {
        const message = action ? `Permission denied: ${action}` : 'Permission denied';
        super('PERMISSION_DENIED', message, { action });
    }
}

/**
 * Error thrown when an operation is invalid or not allowed
 */
export class InvalidOperationError extends CatalystError {
    constructor(message: string, details?: unknown) {
        super('INVALID_OPERATION', message, details);
    }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends CatalystError {
    constructor(message: string, validationErrors?: unknown) {
        super('VALIDATION_ERROR', message, validationErrors);
    }
}

/**
 * Error thrown when a resource already exists
 */
export class AlreadyExistsError extends CatalystError {
    constructor(resource: string, identifier?: string) {
        const message = identifier ? `${resource} '${identifier}' already exists` : `${resource} already exists`;
        super('ALREADY_EXISTS', message, { resource, identifier });
    }
}

/**
 * Helper function to convert any error to CatalystError
 */
export function toCatalystError(error: unknown): CatalystError {
    if (error instanceof CatalystError) {
        return error;
    }

    if (error instanceof Error) {
        return new CatalystError('INTERNAL_ERROR', error.message, {
            originalError: error.name,
            stack: error.stack,
        });
    }

    return new CatalystError('UNKNOWN_ERROR', 'An unknown error occurred', { error });
}
