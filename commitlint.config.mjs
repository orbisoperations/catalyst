export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Even when extending config-conventional, commitlint wants at least one rule defined
        // Chose to redefine an existing rule
        'type-enum': [
            2,
            'always',
            [
                'feat', // New features (e.g., "feat: add user authentication")
                'fix', // Bug fixes (e.g., "fix: resolve issue with login button")
                'docs', // Documentation changes (e.g., "docs: update API documentation")
                'style', // Code style changes that don't affect meaning (formatting, etc.)
                'refactor', // Code changes that neither fix bugs nor add features
                'test', // Adding or correcting tests (e.g., "test: add unit tests for auth module")
                'chore', // Maintenance tasks, build changes, etc. (e.g., "chore: update dependencies")
                'revert', // Reverting a previous commit (e.g., "revert: feat: add user authentication")
            ],
        ],
    },
}
