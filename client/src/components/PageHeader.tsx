import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid={`heading-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {subtitle}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
