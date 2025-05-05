import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            // disable react/react-in-jsx-scope because we are using Next.Js/Chakra UI/React 18
            'react/react-in-jsx-scope': 'off',
            // all JSX should be in .tsx files
            'react/jsx-filename-extension': [1, { extensions: ['.tsx'] }],
        },
    },
    {
        ignores: [
            'coverage',
            '**/public',
            '**/dist',
            'pnpm-lock.yaml',
            'pnpm-workspace.yaml',
            '**/.wrangler/**',
        ],
    },
    eslintPluginPrettierRecommended,
]
