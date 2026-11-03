// ESLint flat config: `npm run lint`.
//
// Errors are reserved for things that are bugs (undefined names, broken hook order,
// unused code); style questions are left to review. React Hooks runs the two classic
// rules: the React Compiler rules in eslint-plugin-react-hooks v6+ are not enabled yet,
// because the app's data-loading effects predate them.
import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/**'] },

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',               // plain JS project, no PropTypes
      'react/no-unescaped-entities': 'off',    // apostrophes in copy render fine
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
    },
  },

  // Node-side files: build config and tests
  {
    files: ['*.config.js', 'src/**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
]
