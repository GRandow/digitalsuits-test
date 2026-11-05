import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/node_modules/', '**/dist/', '**/build/', '.shopify/', '**/shopify.d.ts'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['extensions/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: ['*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
