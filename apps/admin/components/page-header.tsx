export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
