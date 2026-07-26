export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getUserFromRequest, apiSuccess, apiError, logActivity } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import SubjectDoc from '@/models/Subject';
import mongoose from 'mongoose';

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

    await dbConnect();

    const instituteObjId = new mongoose.Types.ObjectId(user.instituteId);

    const existingSubjects = await SubjectDoc.find(
      { instituteId: instituteObjId, deletedAt: null },
      { code: 1 }
    ).lean();
    const existingCodeSet = new Set(existingSubjects.map((s) => s.code?.toLowerCase()));

    let createdCount = 0;
    const errors: string[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || row.Name || row['Subject Name'])?.toString().trim();
      let code = (row.code || row.Code || row['Subject Code'] || '').toString().trim().toUpperCase();
      const description = (row.description || row.Description || null)?.toString().trim() || null;
      const syllabus = (row.syllabus || row.Syllabus || null)?.toString().trim() || null;
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

      toInsert.push({
        instituteId: instituteObjId,
        name,
        code,
        description,
        syllabus,
        maxMarks: Number(maxMarks) || 100,
        passingMarks: Number(passingMarks) || 40,
        isActive: true,
      });
    }

    if (toInsert.length > 0) {
      const inserted = await SubjectDoc.insertMany(toInsert, { ordered: false });
      createdCount = inserted.length;
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
