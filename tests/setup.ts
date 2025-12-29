import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

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

// Mock Prisma Client
const createMockModel = () => ({
  findMany: vi.fn().mockResolvedValue([]),
  findFirst: vi.fn().mockResolvedValue(null),
  findUnique: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  delete: vi.fn().mockResolvedValue({}),
  deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  upsert: vi.fn().mockResolvedValue({}),
  count: vi.fn().mockResolvedValue(0),
});

const mockPrisma = {
  notification: createMockModel(),
  incident: createMockModel(),
  onCallLayerUser: createMockModel(),
  onCallLayer: createMockModel(),
  onCallOverride: createMockModel(),
  onCallShift: createMockModel(),
  onCallSchedule: createMockModel(),
  teamMember: createMockModel(),
  escalationRule: createMockModel(),
  escalationPolicy: createMockModel(),
  service: createMockModel(),
  team: createMockModel(),
  user: createMockModel(),
  oidcConfig: createMockModel(),
  backgroundJob: createMockModel(),
  incidentEvent: createMockModel(),
  slackIntegration: createMockModel(),
  notificationProvider: createMockModel(),
  slackOAuthConfig: createMockModel(),
  apiKey: createMockModel(),
  verificationToken: createMockModel(),
  account: createMockModel(),
  session: createMockModel(),
  $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  $extends: vi.fn().mockReturnThis(),
};

// Mock Prisma under both import paths used in the codebase.
vi.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock Twilio globally for dynamic requires
vi.mock('twilio', () => {
  const mockCreate = vi.fn().mockResolvedValue({ sid: 'mock-sid' });
  const mockClient = {
    messages: {
      create: mockCreate,
    },
  };
  const mockFunc = vi.fn(() => mockClient);
  return {
    default: mockFunc,
    __esModule: true,
  };
});
