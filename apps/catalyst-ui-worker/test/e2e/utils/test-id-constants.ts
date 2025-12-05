/**
 * Test ID Constants for E2E Testing
 *
 * Pattern: <scope>-<element>-<purpose>
 *
 * Rules:
 * - Use testids for app-specific targets; use Playwright roles/labels when stable
 * - Never name testids based on CSS classes, styles, or UI library markup
 * - Never rely on visible text in testids
 * - Keep names predictable so test authors can "guess" them
 * - Use ID-based dynamic testids when possible, otherwise index-based
 */

// =============================================================================
// NAVBAR / TOPBAR
// Test IDs are generated from nav.utils.ts display text:
// `navbar-${display.toLowerCase().replace(/\s+/g, '-')}-link`
// =============================================================================
export const TOPBAR = {
    /** User's organization name display */
    USER_ORG_NAME: 'topbar-user-org-name',
    /** User's email/username display */
    USER_EMAIL_DISPLAY: 'topbar-user-email-display',
} as const;
