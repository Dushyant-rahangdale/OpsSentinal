import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Enforce best practices
      'no-console': 'off', // Allow console statements (useful for debugging and logging)
      'no-debugger': 'warn', // Warn instead of error for debugger statements
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn', // Warn instead of error
      'prefer-arrow-callback': 'off', // Too many warnings
      'prefer-template': 'off', // Too many warnings

      // Prevent common mistakes
      'no-unused-vars': 'off', // TypeScript handles this
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-duplicate-imports': 'warn', // Warn instead of error
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'off', // Too many false positives

      // Code quality
      'eqeqeq': ['warn', 'always', { null: 'ignore' }], // Warn instead of error
      'no-throw-literal': 'warn', // Warn instead of error
      'prefer-promise-reject-errors': 'warn', // Warn instead of error
      'require-await': 'off', // Too many warnings

      // React best practices
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-key': 'warn', // Warn instead of error
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-react': 'off', // Not needed in React 17+
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+

      // Accessibility - reduce to warnings only
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn', // Common in Next.js
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      // Next.js specific
      '@next/next/no-html-link-for-pages': 'warn', // Warn instead of error
      '@next/next/no-img-element': 'warn',
      // Next.js used to provide this rule, but in newer versions it's enforced via React's rule set.
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
