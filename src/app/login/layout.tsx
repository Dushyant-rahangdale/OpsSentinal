export const metadata = {
  title: 'Sign In | OpsKnight',
  description: 'Sign in to OpsKnight - Command incidents. Stay ahead.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" as="image" href="/earth-continents.svg" type="image/svg+xml" />
      <link rel="preload" as="image" href="/earth-clouds.webp" type="image/webp" />
      {children}
    </>
  );
}
