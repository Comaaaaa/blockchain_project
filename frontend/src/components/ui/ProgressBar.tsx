import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  showLabel?: boolean;
  color?: 'orange' | 'green' | 'blue';
}

export default function ProgressBar({
  value,
  max,
  className,
  showLabel = true,
  color = 'orange',
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  const colorClasses = {
    orange: 'bg-orange',
    green: 'bg-green-500',
    blue: 'bg-blue-dark',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-1">{percent.toFixed(0)}% finance</p>
      )}
    </div>
  );
}
