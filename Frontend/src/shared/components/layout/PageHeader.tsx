import type { ReactNode } from 'react';
export function PageHeader({
  title,
  description,
  actions,
  level = 1,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <header className={'page-heading' + (level === 2 ? ' page-subheading' : '')}>
      <div>
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions no-print">{actions}</div>}
    </header>
  );
}
