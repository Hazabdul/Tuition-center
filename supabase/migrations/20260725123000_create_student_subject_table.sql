-- ============ STUDENT-SUBJECT ============
CREATE TABLE IF NOT EXISTS student_subject (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  institute_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_student_subject_student ON student_subject(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_subject ON student_subject(subject_id);
