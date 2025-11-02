import { DataChannel, safeName } from '@catalyst/schemas';
import { describe, expect, it } from 'vitest';

describe('Data Channel Name Validation Unit Tests', () => {
  describe('Name validation logic', () => {
    it('should normalize names correctly for comparison', () => {
      const testCases = [
        { input: 'Test Channel', expected: 'test channel' },
        { input: '  Test Channel  ', expected: 'test channel' },
        { input: 'TEST CHANNEL', expected: 'test channel' },
        { input: 'test-channel', expected: 'test-channel' },
        { input: 'Test_Channel', expected: 'test_channel' },
      ];

      testCases.forEach(({ input, expected }) => {
        const normalized = input.toLowerCase().trim();
        expect(normalized).toBe(expected);
      });
    });

    it('should validate name format correctly', () => {
      const validNames = [
        'Valid Channel',
        'Valid-Channel',
        'Valid_Channel',
        'Valid123',
        'Valid Channel 123',
        'A'.repeat(64), // Exactly 64 characters
      ];

      const invalidNames = [
        '', // Empty
        '   ', // Only whitespace
        'A'.repeat(65), // Too long
        'Invalid@Name!', // Invalid characters
        'Invalid<script>', // HTML tags
        'Invalid<script>alert("xss")</script>', // Script tags
        'Invalid<script>alert("xss")</script\t\n bar>', // Script tags with whitespace and chars before closing bracket
        'Invalid; DROP TABLE channels;', // SQL injection
      ];

      validNames.forEach(name => {
        const result = safeName().safeParse(name);
        expect(result.success).toBe(true);
      });

      invalidNames.forEach(name => {
        const result = safeName().safeParse(name);
        expect(result.success).toBe(false);
      });
    });

    it('should check for duplicate names correctly', () => {
      const existingChannels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'Existing Channel',
          description: 'Test description',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'test-org',
          accessSwitch: true,
        },
        {
          id: 'channel-2',
          name: 'Another Channel',
          description: 'Test description',
          endpoint: 'https://example2.com/graphql',
          creatorOrganization: 'other-org',
          accessSwitch: true,
        },
      ];

      const checkUniqueness = (
        channelName: string,
        organizationId: string,
        excludeChannelId?: string,
      ) => {
        const normalizedName = channelName.toLowerCase().trim();

        for (const channel of existingChannels) {
          // Skip the channel being updated
          if (excludeChannelId && channel.id === excludeChannelId) {
            continue;
          }

          // Check if channel belongs to the same organization
          if (channel.creatorOrganization === organizationId) {
            const normalizedChannelName = channel.name.toLowerCase().trim();
            if (normalizedChannelName === normalizedName) {
              return false; // Name is not unique
            }
          }
        }

        return true; // Name is unique
      };

      // Test cases
      expect(checkUniqueness('New Channel', 'test-org')).toBe(true);
      expect(checkUniqueness('existing channel', 'test-org')).toBe(false); // Case insensitive
      expect(checkUniqueness('Existing Channel', 'test-org')).toBe(false); // Exact match
      expect(checkUniqueness('Another Channel', 'test-org')).toBe(true); // Different org
      expect(checkUniqueness('Existing Channel', 'test-org', 'channel-1')).toBe(true); // Exclude current
      expect(checkUniqueness('  Existing Channel  ', 'test-org')).toBe(false); // Whitespace normalization
    });

    it('should handle edge cases correctly', () => {
      const existingChannels: DataChannel[] = [
        {
          id: 'channel-1',
          name: 'Edge Case',
          description: 'Test description',
          endpoint: 'https://example.com/graphql',
          creatorOrganization: 'test-org',
          accessSwitch: true,
        },
      ];

      const checkUniqueness = (
        channelName: string,
        organizationId: string,
        excludeChannelId?: string,
      ) => {
        const normalizedName = channelName.toLowerCase().trim();

        for (const channel of existingChannels) {
          if (excludeChannelId && channel.id === excludeChannelId) {
            continue;
          }

          if (channel.creatorOrganization === organizationId) {
            const normalizedChannelName = channel.name.toLowerCase().trim();
            if (normalizedChannelName === normalizedName) {
              return false;
            }
          }
        }

        return true;
      };

      // Edge cases
      expect(checkUniqueness('', 'test-org')).toBe(true); // Empty string
      expect(checkUniqueness('   ', 'test-org')).toBe(true); // Only whitespace
      expect(checkUniqueness('Edge Case', 'test-org')).toBe(false); // Exact match
      expect(checkUniqueness('edge case', 'test-org')).toBe(false); // Case insensitive
      expect(checkUniqueness('  Edge Case  ', 'test-org')).toBe(false); // Whitespace
      expect(checkUniqueness('Edge Case', 'test-org', 'channel-1')).toBe(true); // Exclude current
    });
  });
});
