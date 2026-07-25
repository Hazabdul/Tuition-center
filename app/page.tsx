import Link from 'next/link';
import { GraduationCap, Users, BookOpen, BarChart3, Shield, CheckCircle, ArrowRight, Building2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">EduManage</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Institute Login
            </Link>
            <Link
              href="/auth/super-admin/login"
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium mb-8">
          <Shield className="h-3.5 w-3.5" />
          Multi-Tenant SaaS Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
          Complete Institute<br />Management System
        </h1>
        <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
          A powerful SaaS platform for schools, coaching centres, and educational institutions.
          Manage students, teachers, attendance, fees, exams, and results — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/login"
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/super-admin/login"
            className="flex items-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold rounded-xl transition-all"
          >
            Super Admin Login
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30 mb-4">
                  <Icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Role Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Built for Every Role</h2>
          <p className="text-slate-400">Separate dashboards and permissions for every user type</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {roles.map((role) => (
            <div key={role.title} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center mx-auto mb-3`}>
                <role.icon className="h-5 w-5 text-white" />
              </div>
              <p className="font-semibold text-white text-sm">{role.title}</p>
              <p className="text-xs text-slate-500 mt-1">{role.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {capabilities.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
              <span className="text-slate-300 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to manage your institute?</h2>
          <p className="text-slate-400 mb-8">Log in to access your institute&apos;s dashboard</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
          >
            Institute Login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500">
              <GraduationCap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-white">EduManage</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 EduManage. Multi-Tenant Institute Management SaaS.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Building2,
    title: 'Multi-Tenant Architecture',
    description: 'Each institute has completely isolated data. Students, teachers, and parents can only access their own institute.',
  },
  {
    icon: Users,
    title: 'Complete User Management',
    description: 'Manage students, teachers, parents with full profiles, batch assignments, and account controls.',
  },
  {
    icon: BookOpen,
    title: 'Attendance Tracking',
    description: 'Teachers mark daily attendance. Automatic percentage calculations and audit trails for all changes.',
  },
  {
    icon: BarChart3,
    title: 'Fee Management',
    description: 'Create fee structures, assign to batches, record payments, generate receipts, and track overdue fees.',
  },
  {
    icon: GraduationCap,
    title: 'Offline Exam & Marks',
    description: 'Record offline exam results, enter marks, calculate grades, publish results for students and parents.',
  },
  {
    icon: Shield,
    title: 'Subscription Management',
    description: 'Flexible subscription plans with student/teacher limits. Super Admin controls all institutes.',
  },
];

const roles = [
  { title: 'Super Admin', desc: 'Platform control', icon: Shield, color: 'bg-purple-600' },
  { title: 'Institute Admin', desc: 'Institute control', icon: Building2, color: 'bg-blue-600' },
  { title: 'Teacher', desc: 'Teaching tools', icon: BookOpen, color: 'bg-green-600' },
  { title: 'Student', desc: 'View progress', icon: GraduationCap, color: 'bg-amber-600' },
  { title: 'Parent', desc: 'Monitor child', icon: Users, color: 'bg-pink-600' },
];

const capabilities = [
  'Role-based access control for 5 user types',
  'Multi-institute data isolation',
  'JWT access + refresh token auth',
  'Attendance with audit logs',
  'Fee collection and receipt generation',
  'Printable mark sheets',
  'Offline exam management',
  'Grade calculation engine',
  'Result publication workflow',
  'Subscription plan enforcement',
  'CSV export for all reports',
  'In-app notifications',
  'Activity logging',
  'Parent-student linking',
  'Batch and subject management',
  'Teacher assignment to batches',
];
