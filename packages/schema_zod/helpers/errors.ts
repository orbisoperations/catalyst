import { z, ZodError } from 'zod';
import { ErrorInfo } from './result';

export type ValidationErrorObject = z.infer<typeof ErrorInfo>;

export const formatZodError = (err: ZodError): ValidationErrorObject => ({
    code: 'ZOD_VALIDATION_ERROR',
    message: 'Validation failed',
    details: err.flatten(),
});
