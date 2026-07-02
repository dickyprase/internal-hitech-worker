'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatRupiah } from '@/lib/format';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
  formatAsCurrency?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  progress,
  formatAsCurrency = false,
  className
}: StatCardProps) {
  const displayValue = formatAsCurrency && typeof value === 'number' ? formatRupiah(value) : value;

  const rawValue = typeof displayValue === 'string' ? displayValue : String(displayValue);

  const progressPercent = progress
    ? Math.min((progress.current / progress.total) * 100, 100)
    : undefined;

  const progressColor =
    progressPercent !== undefined
      ? progressPercent >= 90
        ? 'text-red-600'
        : progressPercent >= 70
          ? 'text-amber-600'
          : 'text-emerald-600'
      : '';

  const progressBarColor =
    progressPercent !== undefined
      ? progressPercent >= 90
        ? '[&>div]:bg-red-500'
        : progressPercent >= 70
          ? '[&>div]:bg-amber-500'
          : '[&>div]:bg-emerald-500'
      : '';

  return (
    <Card className={className}>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium truncate'>{title}</CardTitle>
        {icon && <div className='text-muted-foreground shrink-0'>{icon}</div>}
      </CardHeader>
      <CardContent className='overflow-hidden'>
        <div className='text-lg sm:text-xl lg:text-2xl font-bold truncate' title={rawValue}>
          {displayValue}
        </div>
        {subtitle && (
          <p className='text-xs text-muted-foreground mt-1 truncate' title={subtitle}>
            {subtitle}
          </p>
        )}
        {progress && (
          <div className='mt-3 space-y-1'>
            <Progress value={progressPercent} className={`h-2 ${progressBarColor}`} />
            <p className={`text-xs ${progressColor}`}>
              {progress.label || `${progress.current} dari ${progress.total}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
