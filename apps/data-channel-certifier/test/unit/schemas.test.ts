import { describe, expect, it } from 'vitest';
import { ValidationReport, ValidationResult } from '../../src/schemas';

describe('schemas (unit)', () => {
  it('parses a valid ValidationResult', () => {
    const input = {
      channelId: 'abc',
      status: 'valid',
      timestamp: Date.now(),
      details: { note: 'ok' },
    } as const;

    const parsed = ValidationResult.parse(input);
    expect(parsed.channelId).toBe('abc');
    expect(parsed.status).toBe<'valid'>('valid');
  });

  it('rejects invalid ValidationStatus', () => {
    const bad = {
      channelId: 'abc',
      status: 'nope',
      timestamp: Date.now(),
      details: {},
    } as unknown;
    expect(() => ValidationResult.parse(bad)).toThrow();
  });

  it('parses a minimal ValidationReport', () => {
    const now = Date.now();
    const input = {
      timestamp: now,
      totalChannels: 0,
      validChannels: 0,
      invalidChannels: 0,
      errorChannels: 0,
      results: [],
    };

    const parsed = ValidationReport.parse(input);
    expect(parsed.timestamp).toBe(now);
    expect(parsed.results.length).toBe(0);
  });
});
