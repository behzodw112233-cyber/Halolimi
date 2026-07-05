import { Card } from '@heroui/react';

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-neutral-200 bg-white shadow-none">
      <Card.Header className="p-5 pb-0">
        <Card.Title className="text-base font-semibold text-neutral-900">{title}</Card.Title>
        {subtitle ? (
          <Card.Description className="mt-0.5 text-sm text-neutral-400">{subtitle}</Card.Description>
        ) : null}
      </Card.Header>
      <Card.Content className="p-3">{children}</Card.Content>
    </Card>
  );
}
