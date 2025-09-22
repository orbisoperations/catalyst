import { z } from 'zod';

export const ValidationStatus = z.enum(['valid', 'invalid', 'error', 'pending', 'unknown']);
export type ValidationStatus = z.infer<typeof ValidationStatus>;

export const ValidationResult = z.object({
  channelId: z.string(),
  status: ValidationStatus,
  timestamp: z.number(),
  error: z.string().optional(),
  details: z.record(z.string(), z.any()),
});
export type ValidationResult = z.infer<typeof ValidationResult>;

export const ValidationReport = z.object({
  timestamp: z.number(),
  totalChannels: z.number(),
  validChannels: z.number(),
  invalidChannels: z.number(),
  errorChannels: z.number(),
  results: ValidationResult.array(),
});
export type ValidationReport = z.infer<typeof ValidationReport>;
