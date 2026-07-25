'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';

interface MarkSheetData {
  institute: { name: string; address: string | null; logo_url: string | null };
  student: { first_name: string; last_name: string | null; student_id: string; admission_number: string };
  exam: { name: string; code: string; academic_year: string | null };
  batch: { name: string } | null;
  marks: Array<{
    id: string;
    subject_name: string;
    max_marks: number;
    obtained_marks: number | null;
    grade: string | null;
    percentage: number | null;
    is_pass: boolean;
    remarks: string | null;
  }>;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  result: string;
}

export default function StudentMarkSheetPage() {
  const api = useApi();
  const params = useParams();
  const examId = params?.examId as string;

  const { data, isLoading } = useQuery<MarkSheetData>({
    queryKey: ['marksheet', examId],
    queryFn: async () => {
      const res = await api.get<MarkSheetData>(`/api/v1/marks/student/me/marksheet/${examId}`);
      return res.data;
    },
    enabled: Boolean(examId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-slate-500">Loading mark sheet...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-slate-500">Mark sheet not available or results not published.</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Print Button — hidden when printing */}
      <div className="no-print flex justify-center gap-3 py-4">
        <Button onClick={() => window.print()} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Mark Sheet
        </Button>
      </div>

      {/* Mark Sheet */}
      <div className="mark-sheet mx-auto max-w-3xl bg-white shadow-lg p-8 mb-8">
        {/* Header */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          {data.institute.logo_url && (
            <img src={data.institute.logo_url} alt="logo" className="h-16 mx-auto mb-2" />
          )}
          <h1 className="text-2xl font-bold text-slate-900 uppercase">{data.institute.name}</h1>
          {data.institute.address && (
            <p className="text-sm text-slate-600 mt-1">{data.institute.address}</p>
          )}
          <h2 className="text-lg font-bold text-slate-800 mt-3 uppercase tracking-wide">Mark Sheet</h2>
        </div>

        {/* Exam Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <table className="w-full">
              <tbody>
                <InfoRow label="Exam Name" value={data.exam.name} />
                <InfoRow label="Exam Code" value={data.exam.code} />
                {data.exam.academic_year && <InfoRow label="Academic Year" value={data.exam.academic_year} />}
                {data.batch && <InfoRow label="Batch" value={data.batch.name} />}
              </tbody>
            </table>
          </div>
          <div>
            <table className="w-full">
              <tbody>
                <InfoRow label="Student Name" value={`${data.student.first_name} ${data.student.last_name || ''}`} />
                <InfoRow label="Student ID" value={data.student.student_id} />
                <InfoRow label="Admission No." value={data.student.admission_number} />
                <InfoRow label="Generated On" value={format(new Date(), 'dd MMM yyyy')} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Marks Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="border border-slate-600 px-3 py-2 text-left text-sm font-semibold">Subject</th>
              <th className="border border-slate-600 px-3 py-2 text-center text-sm font-semibold">Max Marks</th>
              <th className="border border-slate-600 px-3 py-2 text-center text-sm font-semibold">Obtained</th>
              <th className="border border-slate-600 px-3 py-2 text-center text-sm font-semibold">%</th>
              <th className="border border-slate-600 px-3 py-2 text-center text-sm font-semibold">Grade</th>
              <th className="border border-slate-600 px-3 py-2 text-center text-sm font-semibold">Result</th>
              <th className="border border-slate-600 px-3 py-2 text-left text-sm font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {data.marks.map((mark: any, i: number) => (
              <tr key={mark.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-3 py-2 text-sm font-medium">{mark.subject_name}</td>
                <td className="border border-slate-300 px-3 py-2 text-sm text-center">{mark.max_marks}</td>
                <td className="border border-slate-300 px-3 py-2 text-sm text-center font-bold">{mark.obtained_marks ?? 'AB'}</td>
                <td className="border border-slate-300 px-3 py-2 text-sm text-center">{mark.percentage !== null ? `${mark.percentage}%` : '—'}</td>
                <td className="border border-slate-300 px-3 py-2 text-sm text-center font-bold">{mark.grade || '—'}</td>
                <td className="border border-slate-300 px-3 py-2 text-sm text-center">
                  <span className={`font-semibold ${mark.is_pass ? 'text-green-700' : 'text-red-700'}`}>
                    {mark.is_pass ? 'PASS' : 'FAIL'}
                  </span>
                </td>
                <td className="border border-slate-300 px-3 py-2 text-xs text-slate-500">{mark.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-400 px-3 py-2 text-sm">TOTAL</td>
              <td className="border border-slate-400 px-3 py-2 text-sm text-center">{data.totalMarks}</td>
              <td className="border border-slate-400 px-3 py-2 text-sm text-center">{data.obtainedMarks}</td>
              <td className="border border-slate-400 px-3 py-2 text-sm text-center">{data.percentage}%</td>
              <td className="border border-slate-400 px-3 py-2 text-sm text-center">{data.grade}</td>
              <td className="border border-slate-400 px-3 py-2 text-sm text-center">
                <span className={data.result === 'Pass' ? 'text-green-700' : 'text-red-700'}>{data.result.toUpperCase()}</span>
              </td>
              <td className="border border-slate-400 px-3 py-2" />
            </tr>
          </tfoot>
        </table>

        {/* Summary Box */}
        <div className="border-2 border-slate-800 rounded-lg p-4 mb-8">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">Total Marks</p>
              <p className="text-xl font-bold text-slate-900">{data.obtainedMarks}/{data.totalMarks}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">Percentage</p>
              <p className="text-xl font-bold text-slate-900">{data.percentage}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">Grade</p>
              <p className="text-xl font-bold text-slate-900">{data.grade}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">Result</p>
              <p className={`text-xl font-bold ${data.result === 'Pass' ? 'text-green-700' : 'text-red-700'}`}>
                {data.result.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-3 gap-4 mt-12">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-xs text-slate-500">Class Teacher</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-xs text-slate-500">Examiner</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-xs text-slate-500">Principal / Director</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 border-t border-slate-200 pt-4">
          This is a computer generated mark sheet. Generated on {format(new Date(), 'dd MMMM yyyy, h:mm a')}
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .mark-sheet { max-width: 100%; margin: 0; padding: 15mm; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 pr-2 text-slate-500 font-medium whitespace-nowrap">{label}:</td>
      <td className="py-1 pl-2 font-semibold text-slate-800">{value}</td>
    </tr>
  );
}
