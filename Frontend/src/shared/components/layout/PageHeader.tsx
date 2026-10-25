import type { ReactNode } from 'react';
export function PageHeader({
  title,
  description,
  actions,
  icon,
  level = 1,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <header className={'page-heading' + (level === 2 ? ' page-subheading' : '')}>
      <div className="page-title">
        {icon && (
          <span className="page-heading-symbol" aria-hidden="true">
            {icon}
          </span>
        )}
        <div>
          <Heading>{title}</Heading>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="actions no-print">{actions}</div>}
    </header>
  );
}
