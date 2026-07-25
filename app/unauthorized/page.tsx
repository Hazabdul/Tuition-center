import Link from 'next/link';
import { ShieldX, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 mx-auto mb-6">
          <ShieldX className="h-10 w-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Denied</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          You don&apos;t have permission to access this page. This area may be restricted
          to specific roles or your account may not have the required permissions.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Home
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-8">
          Error 403 — Forbidden. If you believe this is a mistake, contact your administrator.
        </p>
      </div>
    </div>
  );
}
