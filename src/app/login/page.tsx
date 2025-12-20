import LoginClient from './LoginClient';

type SearchParams = {
    callbackUrl?: string;
    error?: string;
    password?: string;
};

export default async function LoginPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
    const awaitedSearchParams = await searchParams;
    const callbackUrl = typeof awaitedSearchParams?.callbackUrl === 'string' ? awaitedSearchParams.callbackUrl : '/';
    const errorCode = typeof awaitedSearchParams?.error === 'string' ? awaitedSearchParams.error : null;
    const passwordSet = awaitedSearchParams?.password === '1';

    return (
        <LoginClient callbackUrl={callbackUrl} errorCode={errorCode} passwordSet={passwordSet} />
    );
}
