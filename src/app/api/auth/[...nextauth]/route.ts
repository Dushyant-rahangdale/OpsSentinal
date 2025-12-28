import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

const handler = async (req: Request) => {
    const options = await getAuthOptions();
    const nextAuthHandler = NextAuth(options);
    return nextAuthHandler(req);
};

export { handler as GET, handler as POST };
