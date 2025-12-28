export const metadata = {
  title: 'Sign In | OpsSentinal',
  description: 'Sign in to OpsSentinal - Command incidents. Stay ahead.',
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

