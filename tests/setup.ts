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
  backgroundJob: createMockModel(),
  incidentEvent: createMockModel(),
  slackIntegration: createMockModel(),
  notificationProvider: createMockModel(),
  $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  $extends: vi.fn().mockReturnThis(),
};

vi.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock Twilio globally for dynamic requires
vi.mock('twilio', () => {
  const mockCreate = vi.fn().mockResolvedValue({ sid: 'mock-sid' });
  const mockClient = {
    messages: {
      create: mockCreate
    }
  };
  const mockFunc = vi.fn(() => mockClient);
  return {
    default: mockFunc,
    __esModule: true
  };
});
