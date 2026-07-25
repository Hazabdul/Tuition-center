export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let query = supabase
      .from('attendance')
      .select('id, student_id, batch_id, date, status, remarks, marked_by, created_at, batch:batches(id, name, code)', { count: 'exact' })
      .eq('institute_id', user.instituteId)
      .eq('student_id', params.studentId);

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;

    const records = data || [];
    const totalRecords = count || 0;

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    for (const rec of records) {
      if (rec.status === 'present') presentCount++;
      else if (rec.status === 'absent') absentCount++;
      else if (rec.status === 'late') lateCount++;
      else if (rec.status === 'leave') leaveCount++;
    }

    const attendedCount = presentCount + lateCount;
    const attendancePercentage = totalRecords > 0
      ? Math.round((attendedCount / totalRecords) * 10000) / 100
      : 0;

    return apiSuccess(
      {
        records,
        summary: {
          total: totalRecords,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          leave: leaveCount,
          attended: attendedCount,
          attendancePercentage,
        },
      },
      'Student attendance fetched',
      { page, limit, total: totalRecords, totalPages: Math.ceil(totalRecords / limit) }
    );
  } catch (error) {
    console.error('Student attendance error:', error);
    return apiError('An error occurred', 500);
  }
}
