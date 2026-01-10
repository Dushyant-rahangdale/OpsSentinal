import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role?: string;
      avatarUrl?: string | null;
      gender?: string | null;
    };
  }

  interface User {
    role?: string;
    avatarUrl?: string | null;
    gender?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    avatarUrl?: string | null;
    gender?: string | null;
  }
}
