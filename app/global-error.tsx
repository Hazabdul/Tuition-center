'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Root Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-lg text-center">
          <CardHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Application Error</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              A critical error occurred in the root layout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-100 p-3 rounded-md text-left text-xs font-mono text-slate-700 overflow-x-auto max-h-32 border border-slate-200">
              {error.message || 'Fatal application boundary error'}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => reset()} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" /> Reload Application
            </Button>
          </CardFooter>
        </Card>
      </body>
    </html>
  );
}
