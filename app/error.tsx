'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled App Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full border-slate-200 shadow-lg text-center">
        <CardHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-2">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">Something went wrong!</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            An unexpected error occurred while loading this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 p-3 rounded-md text-left text-xs font-mono text-slate-700 overflow-x-auto max-h-32 border border-slate-200">
            {error.message || 'Unknown runtime error'}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 justify-center">
          <Button onClick={() => reset()} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/login">
              <Home className="h-4 w-4 mr-2" /> Go to Login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
