import Link from 'next/link';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center space-x-2 mb-8">
        <BuildingOffice2Icon className="h-10 w-10 text-orange" />
        <span className="text-2xl font-bold text-blue-dark">
          Token<span className="text-orange">Immo</span>
        </span>
      </Link>
      {children}
    </div>
  );
}
