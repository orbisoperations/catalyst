import pluginJs from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginReact from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';

/**
 * Unified ESLint configuration for the Catalyst monorepo.
 * This is the single source of truth for all packages.
 * ESLint automatically finds this config in parent directories.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
    // Base config for all JavaScript/TypeScript files
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,
    // React config - only applies to .tsx and .jsx files
    {
        files: ['**/*.{tsx,jsx}'],
        plugins: {
            react: pluginReact,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            ...pluginReact.configs.recommended.rules,
            // disable react/react-in-jsx-scope because we are using Next.js/Chakra UI/React 18
            'react/react-in-jsx-scope': 'off',
            // all JSX should be in .tsx files
            'react/jsx-filename-extension': [1, { extensions: ['.tsx'] }],
        },
    },
    // Global ignores
    {
        ignores: [
            'coverage',
            '**/public',
            '**/dist',
            '**/node_modules',
            'pnpm-lock.yaml',
            'pnpm-workspace.yaml',
            '**/.wrangler/**',
            '**/.next/**',
            '**/.open-next/**',
            '**/.turbo/**',
        ],
    },
];
