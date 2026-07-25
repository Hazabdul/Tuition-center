export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'super_admin') {
      return apiError('Unauthorized: Only Super Admins can access full institute details', 403);
    }

    const { id } = await params;

    // 1. Institute Info
    const { data: institute, error: instErr } = await supabase
      .from('institutes')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (instErr || !institute) {
      return apiError('Institute not found', 404);
    }

    // 2. Active Subscription
    const { data: subscription } = await supabase
      .from('institute_subscriptions')
      .select('id, status, start_date, expiry_date, plan:subscription_plans(name, code, monthly_price)')
      .eq('institute_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Teachers Roster
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, employee_id, first_name, last_name, email, phone, qualification, specialization, joining_date, is_active')
      .eq('institute_id', id);

    // 4. Students Directory + Linked Parents
    const { data: students } = await supabase
      .from('students')
      .select('id, student_id, admission_number, first_name, last_name, email, phone, gender, academic_year, is_active')
      .eq('institute_id', id);

    const studentsWithParents = await Promise.all(
      (students || []).map(async (st) => {
        const { data: links } = await supabase
          .from('parent_student')
          .select('parent:parents(first_name, last_name, phone, email, relationship)')
          .eq('student_id', st.id);

        const parents = (links || []).map((l: any) => l.parent).filter(Boolean);
        return { ...st, parents };
      })
    );

    // 5. Batches & Enrolled Counts
    const { data: batches } = await supabase
      .from('batches')
      .select('id, name, code, academic_year, start_time, end_time, capacity, is_active')
      .eq('institute_id', id);

    const batchesWithCount = await Promise.all(
      (batches || []).map(async (b) => {
        const { count } = await supabase
          .from('student_batch')
          .select('id', { count: 'exact' })
          .eq('batch_id', b.id);
        return { ...b, enrolledCount: count || 0 };
      })
    );

    // 6. Subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code, max_marks, passing_marks, is_active')
      .eq('institute_id', id);

    // 7. Exams & Academic Records
    const { data: exams } = await supabase
      .from('exams')
      .select('id, name, code, academic_year, start_date, end_date, status')
      .eq('institute_id', id);

    const examsWithStats = await Promise.all(
      (exams || []).map(async (ex) => {
        const { data: marks } = await supabase
          .from('marks')
          .select('id, is_pass, obtained_marks, max_marks')
          .eq('exam_id', ex.id);

        const totalEntries = marks?.length || 0;
        const passEntries = (marks || []).filter(m => m.is_pass).length;
        const passRate = totalEntries > 0 ? Math.round((passEntries / totalEntries) * 100) : 0;

        return { ...ex, totalEntries, passEntries, passRate };
      })
    );

    // 8. Financial Ledger & Fees Summary
    const { data: feeLedgers } = await supabase
      .from('student_fees')
      .select('total_amount, paid_amount, balance_amount, status')
      .eq('institute_id', id);

    const totalAssignedFees = (feeLedgers || []).reduce((acc, f) => acc + Number(f.total_amount || 0), 0);
    const totalCollectedFees = (feeLedgers || []).reduce((acc, f) => acc + Number(f.paid_amount || 0), 0);
    const pendingFees = (feeLedgers || []).reduce((acc, f) => acc + Number(f.balance_amount || 0), 0);

    const { data: recentPayments } = await supabase
      .from('fee_payments')
      .select('id, receipt_number, amount_paid, payment_date, payment_method, reference_number')
      .eq('institute_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    return apiSuccess({
      institute,
      subscription,
      teachers: teachers || [],
      students: studentsWithParents || [],
      batches: batchesWithCount || [],
      subjects: subjects || [],
      exams: examsWithStats || [],
      feeSummary: {
        totalAssigned: totalAssignedFees,
        totalCollected: totalCollectedFees,
        pending: pendingFees,
        recentPayments: recentPayments || [],
      },
    }, 'Institute detailed 360 view data fetched successfully');
  } catch (error) {
    console.error('Institute details 360 error:', error);
    return apiError('Failed to fetch institute details', 500);
  }
}
