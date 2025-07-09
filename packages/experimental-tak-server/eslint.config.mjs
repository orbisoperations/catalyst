export default [
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                fetch: 'readonly',
            },
        },
    },
];
