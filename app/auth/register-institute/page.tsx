'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Check, Loader2, ArrowRight, ArrowLeft, ShieldCheck, Building2, User, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionPlan } from '@/lib/types';

export default function RegisterInstitutePage() {
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    stateRegion: '',
    country: 'India',
    contactPersonName: '',
    contactPersonPhone: '',
    contactPersonEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
  });

  const [registrationResult, setRegistrationResult] = useState<any>(null);

  const { data: plans, isLoading: loadingPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['public-subscription-plans'],
    queryFn: async () => {
      const res = await api.get<SubscriptionPlan[]>('/api/v1/subscription-plans');
      return res.data || [];
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post('/api/v1/auth/register-institute', payload),
    onSuccess: (res: any) => {
      setRegistrationResult(res.data);
      setStep(4);
      toast({ title: 'Registration Submitted!', description: 'Your institute account is pending activation by Super Admin upon subscription plan verification.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Registration Failed', description: err.message, variant: 'destructive' });
    },
  });

  function setField(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) {
      toast({ title: 'Plan Required', description: 'Please select a subscription plan first', variant: 'destructive' });
      setStep(1);
      return;
    }
    registerMutation.mutate({
      ...form,
      planId: selectedPlan.id,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">EduManage SaaS</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900">Register Your Educational Institute</h1>
          <p className="text-slate-600 mt-2">Get started with complete digital management for your institute</p>
        </div>

        {/* Step Progress */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
            <StepBadge number={1} label="Choose Plan" active={step === 1} completed={step > 1} onClick={() => setStep(1)} />
            <div className="w-8 h-0.5 bg-slate-200" />
            <StepBadge number={2} label="Institute Info" active={step === 2} completed={step > 2} onClick={() => selectedPlan && setStep(2)} />
            <div className="w-8 h-0.5 bg-slate-200" />
            <StepBadge number={3} label="Admin Account" active={step === 3} completed={step > 3} onClick={() => selectedPlan && form.name && setStep(3)} />
          </div>
        )}

        {/* STEP 1: SELECT SUBSCRIPTION PLAN */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Step 1: Select a Subscription Plan</h2>
              <p className="text-sm text-slate-500">Super admin will activate your account upon subscription plan verification</p>
            </div>

            {loadingPlans ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => <div key={i} className="h-72 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(plans || []).map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  return (
                    <Card
                      key={plan.id}
                      className={`cursor-pointer transition-all duration-200 border-2 relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 shadow-lg ring-2 ring-blue-600/20 bg-blue-50/20'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {isSelected && (
                        <div className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" /> Selected Plan
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{plan.name}</span>
                          <Badge variant="outline" className="text-xs uppercase">{plan.code}</Badge>
                        </CardTitle>
                        <CardDescription>{plan.description || 'Full features for modern institutes'}</CardDescription>
                        <div className="mt-4">
                          <span className="text-3xl font-extrabold text-slate-900">${plan.monthlyPrice}</span>
                          <span className="text-xs text-slate-500"> / month</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>Up to <strong>{plan.studentLimit}</strong> Students</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>Up to <strong>{plan.teacherLimit}</strong> Teachers</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>Up to <strong>{plan.adminLimit}</strong> Admins</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          className={`w-full ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        >
                          {isSelected ? 'Plan Selected' : 'Select Plan'}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  if (!selectedPlan) {
                    toast({ title: 'Please select a plan', variant: 'destructive' });
                    return;
                  }
                  setStep(2);
                }}
                disabled={!selectedPlan}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next: Institute Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: INSTITUTE DETAILS */}
        {step === 2 && (
          <Card className="border-slate-200 shadow-sm max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Step 2: Institute Information</span>
              </CardTitle>
              <CardDescription>Enter primary contact and location details for your institute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Institute Name *</Label>
                  <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Cambridge Academy" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Short Code (Optional)</Label>
                  <Input value={form.code} onChange={(e) => setField('code', e.target.value.toUpperCase())} placeholder="e.g. CAMB" maxLength={8} />
                  <p className="text-[11px] text-slate-400">Used for login institute code (Auto-generated if empty)</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Institute Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="info@cambridge.edu" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number *</Label>
                  <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+1 234 567 890" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Person Name</Label>
                  <Input value={form.contactPersonName} onChange={(e) => setField('contactPersonName', e.target.value)} placeholder="Director Name" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Street Address</Label>
                  <Input value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="123 Education Way" />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="London / New York" />
                </div>
                <div className="space-y-1.5">
                  <Label>State / Region</Label>
                  <Input value={form.stateRegion} onChange={(e) => setField('stateRegion', e.target.value)} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!form.name || !form.email) {
                    toast({ title: 'Name and email are required', variant: 'destructive' });
                    return;
                  }
                  setStep(3);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next: Admin Account <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: ADMIN USER ACCOUNT */}
        {step === 3 && (
          <form onSubmit={handleFormSubmit}>
            <Card className="border-slate-200 shadow-sm max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Step 3: Create Institute Admin Account</span>
                </CardTitle>
                <CardDescription>This will be the primary administrator account for your institute</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Admin First Name *</Label>
                    <Input value={form.adminFirstName} onChange={(e) => setField('adminFirstName', e.target.value)} placeholder="John" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Admin Last Name</Label>
                    <Input value={form.adminLastName} onChange={(e) => setField('adminLastName', e.target.value)} placeholder="Doe" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Admin Login Email *</Label>
                    <Input type="email" value={form.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} placeholder="admin@cambridge.edu" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Username (Optional)</Label>
                    <Input value={form.adminUsername} onChange={(e) => setField('adminUsername', e.target.value)} placeholder="john_admin" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password *</Label>
                    <Input type="password" value={form.adminPassword} onChange={(e) => setField('adminPassword', e.target.value)} placeholder="••••••••" required />
                  </div>
                </div>

                {/* Plan Summary Card */}
                <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-blue-900">Selected Plan: {selectedPlan?.name}</span>
                    <p className="text-blue-700 mt-0.5">${selectedPlan?.monthlyPrice}/month · Up to {selectedPlan?.studentLimit} Students</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pending Activation</Badge>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 font-semibold"
                >
                  {registerMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Submit Registration
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}

        {/* STEP 4: REGISTRATION COMPLETE / SUCCESS STATE */}
        {step === 4 && (
          <Card className="border-slate-200 shadow-md max-w-xl mx-auto text-center p-6">
            <CardHeader className="pb-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-2">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-slate-900">Registration Submitted Successfully!</CardTitle>
              <CardDescription className="text-base text-slate-600 mt-2">
                Your institute registration for <strong>{registrationResult?.name}</strong> has been received.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600 border-t border-b border-slate-100 py-4 my-2">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-left space-y-2">
                <p className="font-semibold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-600" /> Account Activation Notice
                </p>
                <p className="text-xs leading-relaxed">
                  Your account is currently in <strong>Pending Activation</strong> status. A Super Administrator will verify your subscription plan purchase and activate your institute account shortly.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left text-xs bg-slate-50 p-3 rounded-md">
                <div>
                  <span className="text-slate-400 block font-medium">Institute Code</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{registrationResult?.code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Plan Selected</span>
                  <span className="font-bold text-slate-900 text-sm">{registrationResult?.planName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Admin Username</span>
                  <span className="font-medium text-slate-800">{registrationResult?.adminCredentials?.username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Admin Email</span>
                  <span className="font-medium text-slate-800">{registrationResult?.adminCredentials?.email}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={() => router.push('/auth/login')}>
                Go to Login Page
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepBadge({ number, label, active, completed, onClick }: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : completed
          ? 'bg-blue-100 text-blue-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
        active ? 'bg-white text-blue-600 font-bold' : completed ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        {completed ? '✓' : number}
      </span>
      <span>{label}</span>
    </button>
  );
}
