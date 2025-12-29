import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth';

const handler = async (req: Request, context: { params: { nextauth: string[] } }) => {
    const options = await getAuthOptions();
    const nextAuthHandler = NextAuth(options);
    return nextAuthHandler(req, context);
};

export { handler as GET, handler as POST };
