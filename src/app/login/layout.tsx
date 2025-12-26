export const metadata = {
  title: 'Sign In | OpsSure',
  description: 'Sign in to OpsSure - Command incidents. Stay ahead.',
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

