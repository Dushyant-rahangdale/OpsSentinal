export const metadata = {
  title: 'Sign In | OpsKnight',
  description: 'Sign in to OpsKnight - Command incidents. Stay ahead.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // The globe textures (~167KB) are deliberately NOT preloaded. They are
  // decoration; the form is the job of this page. Preloading them put them in
  // direct competition with the fonts and JS needed to render and hydrate the
  // sign-in form, delaying interactivity so the scenery could arrive sooner.
  // As CSS background images they still load promptly, just at normal priority.
  return <>{children}</>;
}
