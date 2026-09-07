---
trigger: always_on
description: Quality gates, linting, type-checking, and test verification standards
---

# Testing & Verification Quality Gate

Before submitting or pushing any code changes, verify:

1. **TypeScript Type Safety**:
   ```bash
   npx tsc --noEmit
   ```
   Must pass with 0 errors.

2. **Linting & Code Cleanliness**:
   ```bash
   npx eslint <modified-files>
   ```
   Must pass with 0 errors and 0 warnings (no unused imports or variables).

3. **Unit & Integration Tests**:
   ```bash
   npm test
   # Or run specific test file:
   npx vitest run tests/lib/<file>.test.ts
   ```
   All tests in the touched domain must pass.

4. **Do Not Commit Temporary Files**:
   - Never commit local symlinks (e.g. `node_modules`, `.env.test`).
   - Clean up scratch files and test artifacts before pushing.
