export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, apiSuccess, apiError, hashPassword, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name, code, email, phone, address, city, stateRegion, country,
      contactPersonName, contactPersonPhone, contactPersonEmail,
      adminFirstName, adminLastName, adminEmail, adminUsername, adminPassword,
      planId,
    } = body;

    if (!name) return apiError('Institute name is required', 400);
    if (!adminEmail || !adminPassword) return apiError('Admin email and password are required', 400);
    if (!planId) return apiError('Please select a subscription plan', 400);

    // Auto-generate code if missing
    let instCode = (code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)).toUpperCase();
    if (!instCode) instCode = `INST${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: existingCode } = await supabase
      .from('institutes')
      .select('id')
      .eq('code', instCode)
      .maybeSingle();

    if (existingCode) {
      instCode = `${instCode}${Math.floor(10 + Math.random() * 90)}`;
    }

    // Verify subscription plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (!plan) return apiError('Invalid subscription plan selected', 400);

    // 1. Create Institute in pending_activation status
    const { data: institute, error: instError } = await supabase
      .from('institutes')
      .insert({
        name,
        code: instCode,
        email: email || adminEmail,
        phone: phone || contactPersonPhone,
        address, city, state_region: stateRegion, country: country || 'India',
        contact_person_name: contactPersonName || `${adminFirstName || ''} ${adminLastName || ''}`.trim(),
        contact_person_phone: contactPersonPhone || phone,
        contact_person_email: contactPersonEmail || adminEmail,
        student_limit: plan.student_limit || 100,
        teacher_limit: plan.teacher_limit || 20,
        admin_limit: plan.admin_limit || 3,
        status: 'pending_activation',
      })
      .select('id, name, code, status')
      .single();

    if (instError || !institute) {
      return apiError(instError?.message || 'Failed to register institute', 400);
    }

    // 2. Insert Pending Subscription Record
    const today = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + 1);

    await supabase.from('institute_subscriptions').insert({
      institute_id: institute.id,
      plan_id: plan.id,
      status: 'pending_activation',
      start_date: today.toISOString().split('T')[0],
      expiry_date: futureDate.toISOString().split('T')[0],
    });

    await supabase.from('subscription_history').insert({
      institute_id: institute.id,
      plan_id: plan.id,
      action: 'self_registered',
      new_status: 'pending_activation',
      notes: 'Institute self-registered online',
    });

    // 3. Create Primary Admin User
    const finalUsername = adminUsername || `admin_${instCode.toLowerCase()}`;
    const pwdHash = hashPassword(adminPassword);

    await supabase.from('users').insert({
      institute_id: institute.id,
      role: 'institute_admin',
      username: finalUsername,
      email: adminEmail,
      password_hash: pwdHash,
      first_name: adminFirstName || contactPersonName || 'Institute',
      last_name: adminLastName || 'Admin',
      phone: phone || contactPersonPhone,
      is_active: false, // Activated when Super Admin approves
    });

    // 4. Seed default grading rules
    await supabase.from('grading_rules').insert([
      { institute_id: institute.id, min_percentage: 90, max_percentage: 100, grade: 'A+' },
      { institute_id: institute.id, min_percentage: 80, max_percentage: 89.99, grade: 'A' },
      { institute_id: institute.id, min_percentage: 70, max_percentage: 79.99, grade: 'B' },
      { institute_id: institute.id, min_percentage: 60, max_percentage: 69.99, grade: 'C' },
      { institute_id: institute.id, min_percentage: 50, max_percentage: 59.99, grade: 'D' },
      { institute_id: institute.id, min_percentage: 0, max_percentage: 49.99, grade: 'F' },
    ]);

    await logActivity({
      instituteId: institute.id,
      action: 'institute_self_registered',
      entityType: 'institute',
      entityId: institute.id,
      newValues: { name, code: instCode, plan: plan.name },
      request,
    });

    return apiSuccess({
      instituteId: institute.id,
      code: instCode,
      name: institute.name,
      status: 'pending_activation',
      planName: plan.name,
      adminCredentials: { username: finalUsername, email: adminEmail },
    }, 'Institute registration submitted successfully! Your account is currently pending activation by Super Admin upon subscription plan verification.');
  } catch (error) {
    console.error('Institute registration error:', error);
    return apiError('An error occurred during registration', 500);
  }
}
