import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import stylistic from '@stylistic/eslint-plugin'

const eslintConfig = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'public/**',
      '**/.next/**',
      '.claude/**',
      '.worktrees/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  stylistic.configs.recommended,
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/indent': ['error', 2],
      '@stylistic/no-multiple-empty-lines': ['error', {
        max: 1, maxEOF: 0, maxBOF: 0,
      }],
      '@stylistic/curly-newline': ['error', 'always'],
      '@stylistic/newline-per-chained-call': 'error',
      // '@stylistic/object-curly-newline': ['error', { minProperties: 2 }],
    },
  },
  {
    rules: { '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }] },
  },
]

export default eslintConfig
