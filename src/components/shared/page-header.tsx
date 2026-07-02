interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className='flex items-center justify-between'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
        {subtitle && <p className='text-muted-foreground text-sm'>{subtitle}</p>}
      </div>
      {actions && <div className='flex items-center gap-2'>{actions}</div>}
    </div>
  );
}
