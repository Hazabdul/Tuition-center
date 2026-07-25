export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabase, getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return apiError('Not authenticated', 401);
    if (!['institute_admin', 'super_admin'].includes(user.role)) return apiError('Insufficient permissions', 403);
    if (!user.instituteId) return apiError('No institute associated', 400);

    const body = await request.json();
    const rows = Array.isArray(body) ? body : body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError('Rows array is required', 400);
    }

    const { data: existingSubjects } = await supabase
      .from('subjects')
      .select('code')
      .eq('institute_id', user.instituteId)
      .is('deleted_at', null);

    const existingCodeSet = new Set((existingSubjects || []).map(s => s.code?.toLowerCase()));

    let createdCount = 0;
    const errors: string[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name || row.Name || row['Subject Name'];
      let code = (row.code || row.Code || row['Subject Code'] || '').toString().trim().toUpperCase();
      const description = row.description || row.Description || null;
      const syllabus = row.syllabus || row.Syllabus || null;
      const maxMarks = row.maxMarks || row.max_marks || row['Max Marks'] || 100;
      const passingMarks = row.passingMarks || row.passing_marks || row['Passing Marks'] || 40;

      if (!name) {
        errors.push(`Row ${i + 1}: Subject Name is required`);
        continue;
      }

      if (!code) {
        code = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      }

      if (existingCodeSet.has(code.toLowerCase())) {
        code = `${code}${Math.floor(10 + Math.random() * 90)}`;
      }

      existingCodeSet.add(code.toLowerCase());

      const item: Record<string, unknown> = {
        institute_id: user.instituteId,
        name,
        code,
        description,
        syllabus,
        max_marks: Number(maxMarks) || 100,
        passing_marks: Number(passingMarks) || 40,
        is_active: true,
      };

      toInsert.push(item);
    }

    if (toInsert.length > 0) {
      let { data: inserted, error } = await supabase
        .from('subjects')
        .insert(toInsert)
        .select('id');

      if (error && error.message.includes('syllabus')) {
        // Fallback without syllabus if column not present on table
        const fallbackToInsert = toInsert.map(item => {
          const { syllabus, ...rest } = item;
          return rest;
        });
        const fallbackRes = await supabase.from('subjects').insert(fallbackToInsert).select('id');
        inserted = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        return apiError(error.message, 400);
      }
      createdCount = inserted?.length || 0;
    }

    await logActivity({
      instituteId: user.instituteId,
      userId: user.id,
      action: 'subjects_bulk_imported',
      entityType: 'subject',
      newValues: { count: createdCount },
      request,
    });

    return apiSuccess(
      { created: createdCount, failed: errors.length, errors },
      `Bulk import completed: ${createdCount} subjects imported successfully`
    );
  } catch (error) {
    console.error('Import subjects error:', error);
    return apiError('An error occurred during import', 500);
  }
}
