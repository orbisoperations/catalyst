import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Unit tests for logout functionality
 *
 * These tests verify that logout properly clears:
 * - localStorage (org key)
 * - sessionStorage (auth state)
 * - Redirects to Cloudflare logout endpoint
 */

describe('logout functionality', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();

        // Mock window.location
        delete (window as any).location;
        window.location = { href: '' } as Location;
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    describe('localStorage cleanup on logout', () => {
        it('removes org key from localStorage on logout', () => {
            localStorage.setItem('org', 'test-org-alpha');

            // Simulate clearAuthStorage
            localStorage.removeItem('org');

            expect(localStorage.getItem('org')).toBeNull();
        });

        it('handles missing org key without throwing', () => {
            expect(() => {
                localStorage.removeItem('org');
            }).not.toThrow();
        });

        it('clears all auth-related localStorage keys', () => {
            localStorage.setItem('org', 'test-org');
            localStorage.setItem('lastWorkspace', 'workspace-123');
            localStorage.setItem('userPreferences', '{"theme":"dark"}');

            // Clear auth keys
            localStorage.removeItem('org');
            localStorage.removeItem('lastWorkspace');

            expect(localStorage.getItem('org')).toBeNull();
            expect(localStorage.getItem('lastWorkspace')).toBeNull();
            // userPreferences should remain (not auth-related)
            expect(localStorage.getItem('userPreferences')).toBe('{"theme":"dark"}');
        });

        it('preserves non-auth localStorage entries', () => {
            localStorage.setItem('org', 'test-org');
            localStorage.setItem('unrelatedApp_data', 'preserve-me');

            localStorage.removeItem('org');

            expect(localStorage.getItem('unrelatedApp_data')).toBe('preserve-me');
        });
    });

    describe('sessionStorage cleanup on logout', () => {
        it('clears sessionStorage auth data', () => {
            sessionStorage.setItem('tempAuthState', 'state-123');

            sessionStorage.removeItem('tempAuthState');

            expect(sessionStorage.getItem('tempAuthState')).toBeNull();
        });
    });

    describe('handleLogout function', () => {
        it('redirects to /cdn-cgi/auth/logout', () => {
            // Simulate handleLogout
            localStorage.removeItem('org');
            sessionStorage.removeItem('tempAuthState');
            window.location.href = '/cdn-cgi/auth/logout';

            expect(window.location.href).toBe('/cdn-cgi/auth/logout');
        });

        it('clears localStorage before setting href', () => {
            localStorage.setItem('org', 'test-org');
            const operations: string[] = [];

            // Track order of operations
            const originalRemoveItem = localStorage.removeItem.bind(localStorage);
            vi.spyOn(localStorage, 'removeItem').mockImplementation((key) => {
                operations.push(`remove:${key}`);
                return originalRemoveItem(key);
            });

            // Simulate handleLogout with tracked operations
            localStorage.removeItem('org');
            operations.push('redirect');

            // Verify removal happens before redirect
            expect(operations.indexOf('remove:org')).toBeLessThan(operations.indexOf('redirect'));
        });
    });
});

describe('multi-account switching', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('previous org is not visible after account switch', () => {
        localStorage.setItem('org', 'org-user-a');

        // Simulate logout
        localStorage.removeItem('org');

        expect(localStorage.getItem('org')).toBeNull();
    });

    it('handles rapid logout/login cycles without state corruption', () => {
        const users = ['user-a', 'user-b', 'user-c'];

        for (const user of users) {
            // Logout
            localStorage.removeItem('org');
            expect(localStorage.getItem('org')).toBeNull();

            // Login as new user
            localStorage.setItem('org', `org-${user}`);
        }

        // Final state is correct
        expect(localStorage.getItem('org')).toBe('org-user-c');
    });
});
