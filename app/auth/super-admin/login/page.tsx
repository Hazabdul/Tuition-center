'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SuperAdminLoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.data.accessToken, data.data.refreshToken, data.data.user);
        toast.success('Login successful');
        window.location.href = data.data.redirectPath;
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail('superadmin@edumanage.com');
    setPassword('SuperAdmin@123');
    toast.info('Filled Super Admin credentials');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur mb-3">
            <Shield className="h-7 w-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin Portal</h1>
          <p className="text-sm text-slate-400 mt-1">Platform Administration</p>
        </div>

        <Card className="shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-white">Administrator Login</CardTitle>
            <CardDescription className="text-slate-400">Sign in to manage the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Fill Button */}
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">⚡ Super Admin Credentials</p>
                <p className="text-[11px] text-slate-400">superadmin@edumanage.com</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={fillDemo}
                className="h-8 border-blue-500/50 text-blue-400 hover:bg-blue-950 hover:text-blue-300 text-xs"
              >
                Auto-fill
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-200 text-xs font-medium">Email or Username</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="superadmin@edumanage.com or superadmin"
                  required
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-200 text-xs font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400 pt-2">
              <Link href="/auth/login" className="hover:text-slate-200">← Back to Institute User Login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
