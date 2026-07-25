-- Add syllabus column to subjects table
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS syllabus text;
