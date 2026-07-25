import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function SubscriptionExpiredPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Subscription Expired</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Your institute&apos;s subscription has expired. Please contact your institute administrator
          or renew the subscription to continue accessing the platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-8">
          If you believe this is a mistake, please contact your Super Admin.
        </p>
      </div>
    </div>
  );
}
