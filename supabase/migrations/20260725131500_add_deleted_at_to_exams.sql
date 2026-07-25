-- Add deleted_at column to exams table if not exists
ALTER TABLE exams ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
