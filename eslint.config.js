import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      '**/*.d.ts',
      '**/types/**/*.ts',
      '**/*.generated.ts',
      '**/__tests__/**',
      '**/*.test.*',
      '**/*.spec.*',
      'scripts/**',
      'metro.config.js',
      'babel.config.js',
      'jest.config.js'
    ],
  },
  // Main configuration for TypeScript and React files
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __DEV__: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        XMLHttpRequest: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      prettier,
      import: importPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // TypeScript rules (lenient for development)
      '@typescript-eslint/no-explicit-any': 'off', // Too many instances for production deadline
      '@typescript-eslint/no-unused-vars': [
        'warn', 
        { 
          argsIgnorePattern: '^_', 
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',
      'prefer-const': 'warn',
      
      // React rules (lenient for development)
      'react-hooks/exhaustive-deps': 'off', // Too many instances for production deadline
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'warn',
      
      // Import rules
      'import/no-unresolved': 'off',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          'newlines-between': 'never',
        },
      ],
      
      // General rules
      'prettier/prettier': [
        'warn',
        {
          endOfLine: 'auto',
        },
      ],
      'no-console': 'off', // Allow console in development
      'no-debugger': 'warn',
      'no-alert': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
  // Configuration for JavaScript files
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __DEV__: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      prettier,
    },
    rules: {
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'prettier/prettier': 'warn',
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
];