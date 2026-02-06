import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function PageContainer({ children, className, title, subtitle }: PageContainerProps) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8', className)}>
      {(title || subtitle) && (
        <div className="mb-8">
          {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
