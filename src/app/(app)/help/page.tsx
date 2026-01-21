import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/shadcn/card';
import Link from 'next/link';

const helpCards = [
  {
    href: '/incidents',
    title: 'Incident workflow',
    description: 'Trigger, acknowledge, and resolve incidents with confidence.',
  },
  {
    href: '/schedules',
    title: 'Schedules',
    description: 'Build on-call rotations and coverage handoffs.',
  },
  {
    href: '/services',
    title: 'Services',
    description: 'Connect monitors and integrations to services.',
  },
  {
    href: '/policies',
    title: 'Policies',
    description: 'Define escalation paths and responder roles.',
  },
];

export default function HelpPage() {
  return (
    <main className="max-w-[980px] mx-auto py-6">
      <h1 className="text-3xl font-bold mb-2">Help and docs</h1>
      <p className="text-muted-foreground mb-6">
        Quick links to common workflows and support resources.
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {helpCards.map(card => (
          <Link key={card.href} href={card.href} className="no-underline">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer hover:-translate-y-0.5 duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{card.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Need direct support?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contact your OpsKnight administrator or reach out to your internal support channel.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
