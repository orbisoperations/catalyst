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
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
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
 * Error thrown when an external service is unavailable
 * HTTP Status: 503 Service Unavailable
 */
export class ServiceUnavailableError extends CatalystError {
    constructor(serviceName: string, details?: unknown) {
        super('SERVICE_UNAVAILABLE', `Service '${serviceName}' is currently unavailable`, {
            serviceName,
            ...(details && typeof details === 'object' ? details : {}),
        });
    }
}

/**
 * Error thrown when a request or operation times out
 * HTTP Status: 408 Request Timeout / 504 Gateway Timeout
 */
export class TimeoutError extends CatalystError {
    constructor(operation: string, timeoutMs: number, details?: unknown) {
        super('TIMEOUT', `Operation '${operation}' timed out after ${timeoutMs}ms`, {
            operation,
            timeoutMs,
            ...(details && typeof details === 'object' ? details : {}),
        });
    }
}

/**
 * Error thrown when an operation conflicts with the current resource state
 * HTTP Status: 409 Conflict
 * Examples: "already deleted", "already revoked", duplicate operations
 */
export class ConflictError extends CatalystError {
    constructor(message: string, details?: unknown) {
        super('CONFLICT', message, details);
    }
}

/**
 * Error thrown when a request is malformed or contains invalid data
 * HTTP Status: 400 Bad Request
 */
export class BadRequestError extends CatalystError {
    constructor(message: string, details?: unknown) {
        super('BAD_REQUEST', message, details);
    }
}

/**
 * Error thrown for unexpected internal server errors
 * HTTP Status: 500 Internal Server Error
 */
export class InternalServerError extends CatalystError {
    constructor(message = 'An internal server error occurred', details?: unknown) {
        super('INTERNAL_SERVER_ERROR', message, details);
    }
}

/**
 * Error thrown when network operations fail
 * HTTP Status: 502 Bad Gateway
 */
export class NetworkError extends CatalystError {
    constructor(endpoint: string, statusCode?: number, details?: unknown) {
        const message = statusCode
            ? `Network error when contacting ${endpoint}: HTTP ${statusCode}`
            : `Network error when contacting ${endpoint}`;
        super('NETWORK_ERROR', message, {
            endpoint,
            statusCode,
            ...(details && typeof details === 'object' ? details : {}),
        });
    }
}

/**
 * Error thrown when parsing operations fail (JSON, XML, etc.)
 */
export class ParseError extends CatalystError {
    constructor(format: string, details?: unknown) {
        super('PARSE_ERROR', `Failed to parse ${format}`, details);
    }
}

/**
 * Error thrown when token validation fails
 * Specialized version of UnauthorizedError with token-specific context
 * HTTP Status: 401 Unauthorized
 */
export class InvalidTokenError extends CatalystError {
    constructor(reason?: string) {
        const message = reason ? `Invalid token: ${reason}` : 'Invalid or expired token';
        super('INVALID_TOKEN', message, { reason });
    }
}

/**
 * Error thrown when a resource is in an invalid state for the requested operation
 * HTTP Status: 422 Unprocessable Entity
 * Example: Trying to activate an already-active resource
 */
export class InvalidStateError extends CatalystError {
    constructor(resource: string, currentState: string, requiredState?: string) {
        const message = requiredState
            ? `${resource} is in state '${currentState}', expected '${requiredState}'`
            : `${resource} is in invalid state '${currentState}'`;
        super('INVALID_STATE', message, { resource, currentState, requiredState });
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

/**
 * Maps HTTP status codes to appropriate CatalystError classes
 * Useful for converting HTTP responses to typed errors
 *
 * @param statusCode - HTTP status code
 * @param message - Optional custom error message
 * @param details - Optional error details/context
 * @returns Appropriate CatalystError subclass
 *
 * @example
 * ```typescript
 * const error = httpStatusToError(404, 'User not found', { userId: '123' });
 * // Returns NotFoundError instance
 * ```
 */
export function httpStatusToError(statusCode: number, message?: string, details?: unknown): CatalystError {
    const detailsObj = details && typeof details === 'object' ? (details as Record<string, unknown>) : {};

    switch (statusCode) {
        case 400:
            return new BadRequestError(message || 'Bad request', details);
        case 401:
            return new UnauthorizedError(message);
        case 403:
            return new PermissionDeniedError(message);
        case 404:
            return new NotFoundError('Resource', detailsObj.identifier as string);
        case 408:
            return new TimeoutError('Request', 30000, details);
        case 409:
            return new ConflictError(message || 'Conflict', details);
        case 422:
            return new ValidationError(message || 'Validation failed', details);
        case 500:
            return new InternalServerError(message, details);
        case 502:
            return new NetworkError((detailsObj.endpoint as string) || 'unknown', statusCode, details);
        case 503:
            return new ServiceUnavailableError((detailsObj.service as string) || 'Unknown', details);
        case 504:
            return new TimeoutError('Gateway', 30000, details);
        default:
            return new CatalystError(`HTTP_${statusCode}`, message || `HTTP error ${statusCode}`, details);
    }
}

/**
 * Maps CatalystError error codes to HTTP status codes
 * Useful for HTTP response generation
 *
 * @param error - CatalystError instance
 * @returns Appropriate HTTP status code
 *
 * @example
 * ```typescript
 * const error = new NotFoundError('User', '123');
 * const statusCode = errorToHttpStatus(error); // Returns 404
 * ```
 */
export function errorToHttpStatus(error: CatalystError): number {
    const codeMap: Record<string, number> = {
        BAD_REQUEST: 400,
        VALIDATION_ERROR: 400,
        UNAUTHORIZED: 401,
        INVALID_TOKEN: 401,
        INVALID_USER: 401,
        PERMISSION_DENIED: 403,
        NOT_FOUND: 404,
        INVITE_NOT_FOUND: 404,
        TIMEOUT: 408,
        CONFLICT: 409,
        ALREADY_EXISTS: 409,
        INVALID_STATE: 422,
        INVALID_OPERATION: 422,
        INTERNAL_SERVER_ERROR: 500,
        INTERNAL_ERROR: 500,
        UNKNOWN_ERROR: 500,
        NETWORK_ERROR: 502,
        SERVICE_UNAVAILABLE: 503,
        PARSE_ERROR: 400,
    };
    return codeMap[error.code] || 500;
}

/**
 * Intelligently converts any error to a CatalystError with proper classification
 * Analyzes error messages to determine the most appropriate error type
 *
 * @param error - Any error value (Error, CatalystError, unknown)
 * @returns Classified CatalystError instance
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const catalystError = classifyError(error);
 *   // Returns appropriate error type based on error message patterns
 * }
 * ```
 */
export function classifyError(error: unknown): CatalystError {
    if (error instanceof CatalystError) {
        return error;
    }

    if (error instanceof Error) {
        // Check for common error message patterns
        const msg = error.message.toLowerCase();

        if (msg.includes('not found')) {
            return new NotFoundError('Resource');
        }
        if (msg.includes('unauthorized') || msg.includes('authentication failed')) {
            return new UnauthorizedError(error.message);
        }
        if (msg.includes('permission denied') || msg.includes('forbidden')) {
            return new PermissionDeniedError();
        }
        if (msg.includes('timeout') || msg.includes('timed out')) {
            return new TimeoutError('Operation', 30000);
        }
        if (msg.includes('already exists') || msg.includes('duplicate')) {
            return new AlreadyExistsError('Resource');
        }
        if (msg.includes('already deleted') || msg.includes('already revoked')) {
            return new ConflictError(error.message);
        }
        if (msg.includes('invalid') || msg.includes('validation')) {
            return new ValidationError(error.message);
        }
        if (msg.includes('unavailable') || msg.includes('service down')) {
            return new ServiceUnavailableError('Service');
        }
        if (msg.includes('network error') || msg.includes('connection')) {
            return new NetworkError('unknown');
        }
        if (msg.includes('parse') || msg.includes('json')) {
            return new ParseError('data');
        }

        // Default to internal error
        return new InternalServerError(error.message, {
            originalError: error.name,
            stack: error.stack,
        });
    }

    return new InternalServerError('An unknown error occurred', { error });
}
