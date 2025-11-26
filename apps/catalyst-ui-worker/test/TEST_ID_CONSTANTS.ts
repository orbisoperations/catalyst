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
// =============================================================================
export const NAVBAR = {
    LOGO: 'navbar-logo',
    CHANNELS_LINK: 'navbar-channels-link',
    PARTNERS_LINK: 'navbar-partners-link',
    TOKENS_LINK: 'navbar-tokens-link',
    PROFILE_BUTTON: 'navbar-profile-button',
    ORG_NAME: 'navbar-org-name',
    USER_EMAIL: 'navbar-user-email',
} as const;

// =============================================================================
// CHANNELS PAGE
// =============================================================================
export const CHANNELS = {
    FILTER_DROPDOWN: 'channels-filter-dropdown',
    CREATE_BUTTON: 'channels-create-button',
    LOADING_SPINNER: 'channels-loading-spinner',
    EMPTY_STATE: 'channels-empty-state',

    // Dynamic row IDs - use with channel ID
    // Example: getChannelRow('ch-123') => 'channels-row-ch-123'
    row: (channelId: string) => `channels-row-${channelId}` as const,
    rowBadge: (channelId: string) => `channels-row-${channelId}-badge` as const,
    rowValidateButton: (channelId: string) => `channels-row-${channelId}-validate-button` as const,
    rowDeleteButton: (channelId: string) => `channels-row-${channelId}-delete-button` as const,
    rowMenuButton: (channelId: string) => `channels-row-${channelId}-menu-button` as const,

    // Index-based fallback when ID not available
    // Example: getChannelRowByIndex(0) => 'channels-row-0'
    rowByIndex: (index: number) => `channels-row-${index}` as const,
} as const;

// =============================================================================
// TOKENS / API KEYS PAGE
// =============================================================================
export const TOKENS = {
    CREATE_BUTTON: 'tokens-create-button',
    LOADING_SPINNER: 'tokens-loading-spinner',
    EMPTY_STATE: 'tokens-empty-state',
    ERROR_CARD: 'tokens-error-card',
    RETRY_BUTTON: 'tokens-retry-button',

    // Admin Panel
    ADMIN_PANEL: 'tokens-admin-panel',
    ADMIN_ROTATE_BUTTON: 'tokens-admin-rotate-button',

    // Dynamic token row IDs
    row: (tokenId: string) => `tokens-row-${tokenId}` as const,
    rowName: (tokenId: string) => `tokens-row-${tokenId}-name` as const,
    rowDescription: (tokenId: string) => `tokens-row-${tokenId}-description` as const,
    rowMenuButton: (tokenId: string) => `tokens-row-${tokenId}-menu-button` as const,
    rowDeleteButton: (tokenId: string) => `tokens-row-${tokenId}-delete-button` as const,
} as const;

// =============================================================================
// PARTNERS PAGE
// =============================================================================
export const PARTNERS = {
    FILTER_DROPDOWN: 'partners-filter-dropdown',
    CREATE_BUTTON: 'partners-create-button',
    LOADING_SPINNER: 'partners-loading-spinner',
    EMPTY_STATE: 'partners-empty-state',

    row: (partnerId: string) => `partners-row-${partnerId}` as const,
    rowStatus: (partnerId: string) => `partners-row-${partnerId}-status` as const,
    rowMenuButton: (partnerId: string) => `partners-row-${partnerId}-menu-button` as const,
} as const;

// =============================================================================
// MODALS & DIALOGS
// =============================================================================
export const MODAL = {
    CONFIRM_DELETE: 'modal-confirm-delete',
    CONFIRM_DELETE_TITLE: 'modal-confirm-delete-title',
    CONFIRM_DELETE_BODY: 'modal-confirm-delete-body',
    CONFIRM_BUTTON: 'modal-confirm-button',
    CANCEL_BUTTON: 'modal-cancel-button',
} as const;

// =============================================================================
// FORMS
// =============================================================================
export const FORM = {
    // Generic form elements
    SUBMIT_BUTTON: 'form-submit-button',
    CANCEL_BUTTON: 'form-cancel-button',

    // Channel creation
    CHANNEL_NAME_INPUT: 'form-channel-name-input',
    CHANNEL_DESCRIPTION_INPUT: 'form-channel-description-input',

    // Token creation
    TOKEN_NAME_INPUT: 'form-token-name-input',
    TOKEN_DESCRIPTION_INPUT: 'form-token-description-input',
    TOKEN_EXPIRY_INPUT: 'form-token-expiry-input',
} as const;

// =============================================================================
// COMMON UI ELEMENTS
// =============================================================================
export const COMMON = {
    LOADING_SPINNER: 'loading-spinner',
    ERROR_MESSAGE: 'error-message',
    SUCCESS_MESSAGE: 'success-message',
    BACK_BUTTON: 'back-button',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get test ID for a specific element
 * Use this for consistent test ID retrieval in tests
 */
export function getTestId(testId: string): string {
    return `[data-testid="${testId}"]`;
}

/**
 * Type-safe test ID builder
 * Ensures you can only use defined test IDs
 */
export type TestId =
    | (typeof NAVBAR)[keyof typeof NAVBAR]
    | (typeof CHANNELS)[keyof typeof CHANNELS]
    | (typeof TOKENS)[keyof typeof TOKENS]
    | (typeof PARTNERS)[keyof typeof PARTNERS]
    | (typeof MODAL)[keyof typeof MODAL]
    | (typeof FORM)[keyof typeof FORM]
    | (typeof COMMON)[keyof typeof COMMON];
