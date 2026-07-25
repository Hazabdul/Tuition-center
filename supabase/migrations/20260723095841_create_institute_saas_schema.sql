/*
# Institute Management SaaS - Complete Schema

## Overview
Multi-tenant SaaS platform for educational institutes. Each institute has isolated data.
Custom JWT auth - users stored in `users` table with bcrypt password hashes.
Backend (Next.js API routes) uses service role key; RLS is a secondary boundary.

## Tables
institutes, subscription_plans, institute_subscriptions, subscription_history,
users, refresh_tokens, password_reset_tokens, students, teachers, parents,
parent_student, batches, student_batch, teacher_batch, subjects, batch_subject,
teacher_subject, attendance, attendance_audit_log, fee_categories, fee_structures,
student_fees, fee_payments, fee_payment_audit_log, exams, exam_subjects, marks,
grading_rules, notifications, activity_logs
*/

-- ============ INSTITUTES ============
CREATE TABLE IF NOT EXISTS institutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  email text,
  phone text,
  alt_phone text,
  address text,
  city text,
  state_region text,
  country text DEFAULT 'India',
  postal_code text,
  logo_url text,
  contact_person_name text,
  contact_person_phone text,
  contact_person_email text,
  status text NOT NULL DEFAULT 'active',
  student_limit int NOT NULL DEFAULT 100,
  teacher_limit int NOT NULL DEFAULT 20,
  admin_limit int NOT NULL DEFAULT 3,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_institutes_status ON institutes(status);
CREATE INDEX IF NOT EXISTS idx_institutes_created_at ON institutes(created_at);

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  annual_price numeric(10,2) NOT NULL DEFAULT 0,
  student_limit int NOT NULL DEFAULT 50,
  teacher_limit int NOT NULL DEFAULT 10,
  admin_limit int NOT NULL DEFAULT 2,
  trial_duration_days int NOT NULL DEFAULT 14,
  features text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INSTITUTE SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS institute_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'trial',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inst_sub_institute ON institute_subscriptions(institute_id);
CREATE INDEX IF NOT EXISTS idx_inst_sub_status ON institute_subscriptions(status);

-- ============ SUBSCRIPTION HISTORY ============
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id),
  action text NOT NULL,
  old_status text,
  new_status text,
  old_expiry date,
  new_expiry date,
  notes text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_history_institute ON subscription_history(institute_id);

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid REFERENCES institutes(id) ON DELETE CASCADE,
  role text NOT NULL,
  username text,
  email text,
  phone text,
  student_id text,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  profile_photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_institute ON users(institute_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);

-- ============ REFRESH TOKENS ============
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  replaced_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============ PASSWORD RESET TOKENS ============
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ STUDENTS ============
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  student_id text NOT NULL,
  admission_number text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  date_of_birth date,
  gender text,
  email text,
  phone text,
  alt_phone text,
  address text,
  admission_date date NOT NULL DEFAULT CURRENT_DATE,
  academic_year text,
  profile_photo_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, student_id),
  UNIQUE(institute_id, admission_number)
);
CREATE INDEX IF NOT EXISTS idx_students_institute ON students(institute_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active);

-- ============ TEACHERS ============
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  employee_id text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  alt_phone text,
  qualification text,
  specialization text,
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  address text,
  profile_photo_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_teachers_institute ON teachers(institute_id);

-- ============ PARENTS ============
CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  alt_phone text,
  address text,
  relationship text,
  occupation text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parents_institute ON parents(institute_id);

-- ============ PARENT-STUDENT LINK ============
CREATE TABLE IF NOT EXISTS parent_student (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  institute_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_parent_student_parent ON parent_student(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student ON parent_student(student_id);

-- ============ BATCHES ============
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  academic_year text,
  start_date date,
  end_date date,
  start_time text,
  end_time text,
  capacity int NOT NULL DEFAULT 30,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, code)
);
CREATE INDEX IF NOT EXISTS idx_batches_institute ON batches(institute_id);

-- ============ STUDENT-BATCH ============
CREATE TABLE IF NOT EXISTS student_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  institute_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, batch_id)
);
CREATE INDEX IF NOT EXISTS idx_student_batch_student ON student_batch(student_id);
CREATE INDEX IF NOT EXISTS idx_student_batch_batch ON student_batch(batch_id);

-- ============ TEACHER-BATCH ============
CREATE TABLE IF NOT EXISTS teacher_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  institute_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, batch_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_batch_teacher ON teacher_batch(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_batch_batch ON teacher_batch(batch_id);

-- ============ SUBJECTS ============
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  max_marks numeric(6,2) NOT NULL DEFAULT 100,
  passing_marks numeric(6,2) NOT NULL DEFAULT 40,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, code)
);
CREATE INDEX IF NOT EXISTS idx_subjects_institute ON subjects(institute_id);

-- ============ BATCH-SUBJECT ============
CREATE TABLE IF NOT EXISTS batch_subject (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  institute_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(batch_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_subject_batch ON batch_subject(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_subject_subject ON batch_subject(subject_id);

-- ============ TEACHER-SUBJECT ============
CREATE TABLE IF NOT EXISTS teacher_subject (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  institute_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject_id, batch_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_teacher ON teacher_subject(teacher_id);

-- ============ ATTENDANCE ============
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL,
  remarks text,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, student_id, batch_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_institute ON attendance(institute_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_batch ON attendance(batch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- ============ ATTENDANCE AUDIT LOG ============
CREATE TABLE IF NOT EXISTS attendance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  attendance_id uuid,
  student_id uuid,
  batch_id uuid,
  date date,
  old_status text,
  new_status text,
  action text NOT NULL,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_att_audit_institute ON attendance_audit_log(institute_id);

-- ============ FEE CATEGORIES ============
CREATE TABLE IF NOT EXISTS fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, code)
);
CREATE INDEX IF NOT EXISTS idx_fee_cat_institute ON fee_categories(institute_id);

-- ============ FEE STRUCTURES ============
CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES batches(id) ON DELETE SET NULL,
  academic_year text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  due_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_struct_institute ON fee_structures(institute_id);
CREATE INDEX IF NOT EXISTS idx_fee_struct_batch ON fee_structures(batch_id);

-- ============ STUDENT FEES ============
CREATE TABLE IF NOT EXISTS student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  structure_id uuid REFERENCES fee_structures(id) ON DELETE SET NULL,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  waived_amount numeric(10,2) NOT NULL DEFAULT 0,
  paid_amount numeric(10,2) NOT NULL DEFAULT 0,
  balance_amount numeric(10,2) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_institute ON student_fees(institute_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);
CREATE INDEX IF NOT EXISTS idx_student_fees_due ON student_fees(due_date);

-- ============ FEE PAYMENTS ============
CREATE TABLE IF NOT EXISTS fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_fee_id uuid NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  reference_number text,
  receipt_number text NOT NULL,
  collected_by uuid,
  is_reversed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_institute ON fee_payments(institute_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);

-- ============ FEE PAYMENT AUDIT LOG ============
CREATE TABLE IF NOT EXISTS fee_payment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  payment_id uuid,
  action text NOT NULL,
  amount numeric(10,2),
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ EXAMS ============
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  academic_year text,
  start_date date,
  end_date date,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, code)
);
CREATE INDEX IF NOT EXISTS idx_exams_institute ON exams(institute_id);
CREATE INDEX IF NOT EXISTS idx_exams_batch ON exams(batch_id);

-- ============ EXAM SUBJECTS ============
CREATE TABLE IF NOT EXISTS exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  institute_id uuid NOT NULL,
  exam_date date,
  start_time text,
  end_time text,
  max_marks numeric(6,2) NOT NULL DEFAULT 100,
  passing_marks numeric(6,2) NOT NULL DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(exam_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam ON exam_subjects(exam_id);

-- ============ MARKS ============
CREATE TABLE IF NOT EXISTS marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  max_marks numeric(6,2) NOT NULL DEFAULT 100,
  obtained_marks numeric(6,2),
  grade text,
  percentage numeric(5,2),
  is_pass boolean DEFAULT true,
  remarks text,
  entered_by uuid,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, student_id, exam_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks(subject_id);

-- ============ GRADING RULES ============
CREATE TABLE IF NOT EXISTS grading_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  min_percentage numeric(5,2) NOT NULL,
  max_percentage numeric(5,2) NOT NULL,
  grade text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, grade)
);
CREATE INDEX IF NOT EXISTS idx_grading_institute ON grading_rules(institute_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_institute ON notifications(institute_id);

-- ============ ACTIVITY LOGS ============
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_institute ON activity_logs(institute_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);

-- ============ RLS ============
ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE institute_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_subject ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'institutes','subscription_plans','institute_subscriptions','subscription_history',
    'users','students','teachers','parents','parent_student','batches','student_batch',
    'teacher_batch','subjects','batch_subject','teacher_subject','attendance',
    'attendance_audit_log','fee_categories','fee_structures','student_fees','fee_payments',
    'fee_payment_audit_log','exams','exam_subjects','marks','grading_rules',
    'notifications','activity_logs'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'read_all_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true);', 'read_all_' || t, t);
  END LOOP;
END$$;