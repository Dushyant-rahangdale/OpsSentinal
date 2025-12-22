export const metadata = {
  title: 'Sign In | OpsGuard',
  description: 'Sign in to OpsGuard - Command incidents. Stay ahead.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
