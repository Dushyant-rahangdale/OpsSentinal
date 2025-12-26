import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

// Cleanup after each test (only if @testing-library/react is available)
try {
  const { cleanup } = require('@testing-library/react');
  afterEach(() => {
    cleanup();
  });
} catch {
  // @testing-library/react not available, skip cleanup
}

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Next.js helper that enforces server-only imports can be mocked as a no-op in tests
vi.mock('server-only', () => ({}));

