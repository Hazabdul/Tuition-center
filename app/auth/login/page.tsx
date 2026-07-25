'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, UserCheck, BookOpen, Users, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const DEMO_ACCOUNTS = [
  { label: 'Admin', code: 'APEX01', user: 'admin', icon: UserCheck, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Teacher', code: 'APEX01', user: 'teacher_physics', icon: BookOpen, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Student', code: 'APEX01', user: 'aarav', icon: GraduationCap, color: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'Parent', code: 'APEX01', user: 'parent_suresh', icon: Users, color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [instituteCode, setInstituteCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instituteCode, identifier, password }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.data.accessToken, data.data.refreshToken, data.data.user, instituteCode);
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

  function fillDemo(code: string, user: string) {
    setInstituteCode(code);
    setIdentifier(user);
    setPassword('Password@123');
    toast.info(`Filled demo credentials for ${user}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">EduManage</span>
          </div>
          <p className="text-sm text-slate-500">Institute Management Platform</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Institute Login</CardTitle>
            <CardDescription>Sign in to your institute account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* One-Click Quick Fill Demo Buttons */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">⚡ Quick Fill Demo Logins</span>
                <span className="text-[10px] text-slate-400 font-mono">Pass: Password@123</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.label}
                      type="button"
                      onClick={() => fillDemo(acc.code, acc.user)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-all hover:scale-[1.02] text-left ${acc.color}`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="instituteCode" className="text-xs font-medium">Institute Code</Label>
                <Input
                  id="instituteCode"
                  value={instituteCode}
                  onChange={e => setInstituteCode(e.target.value)}
                  placeholder="e.g. APEX01"
                  required
                  className="uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="identifier" className="text-xs font-medium">Username or Email</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. admin, teacher_physics, aarav"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="flex items-center justify-between text-xs pt-1">
              <Link href="/auth/forgot-password" className="text-blue-600 hover:underline">
                Forgot password?
              </Link>
              <Link href="/auth/super-admin/login" className="text-slate-500 hover:text-slate-700 font-medium">
                Super Admin Login →
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link href="/" className="hover:text-slate-700">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
