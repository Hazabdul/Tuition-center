const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cjtmrdbvoxjvgdqewvoz.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqdG1yZGJ2b3hqdmdkcWV3dm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTY2NjAsImV4cCI6MjEwMDM3MjY2MH0.j7PqNv9PyxOEbYjjaosxHhtpZN8fYsRsWXMeZNif9nw';

const supabase = createClient(url, key);

async function seedMore() {
  console.log('🌱 Starting comprehensive database cleanup and multi-tenant seeding...');

  const tables = [
    'activity_logs', 'notifications', 'marks', 'exam_subjects', 'exams',
    'grading_rules', 'fee_payment_audit_log', 'fee_payments', 'student_fees',
    'fee_structures', 'fee_categories', 'attendance_audit_log', 'attendance',
    'teacher_subject', 'batch_subject', 'teacher_batch', 'student_batch',
    'parent_student', 'parents', 'teachers', 'students', 'refresh_tokens',
    'password_reset_tokens', 'users', 'subscription_history', 'institute_subscriptions',
    'subscription_plans', 'subjects', 'batches', 'institutes'
  ];

  for (const t of tables) {
    await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
  console.log('✅ Cleared all existing database tables.');

  const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);

  // 1. Subscription Plans
  await supabase.from('subscription_plans').insert([
    {
      id: 'f0000000-0000-0000-0000-000000000001',
      name: 'Starter',
      code: 'starter',
      description: 'Ideal for small coaching centres & tuition hubs',
      monthly_price: 2999,
      annual_price: 29990,
      student_limit: 100,
      teacher_limit: 10,
      admin_limit: 2,
      features: 'Attendance Management, Basic Fee Collection, Offline Exam Marks, Reports',
      status: 'active',
    },
    {
      id: 'f0000000-0000-0000-0000-000000000002',
      name: 'Professional',
      code: 'pro',
      description: 'Ideal for medium schools and institutions',
      monthly_price: 7999,
      annual_price: 79990,
      student_limit: 500,
      teacher_limit: 50,
      admin_limit: 5,
      features: 'All Starter Features, Printable Mark Sheets, Parent Portal, Activity Logs, Advanced Reports',
      status: 'active',
    },
    {
      id: 'f0000000-0000-0000-0000-000000000003',
      name: 'Enterprise',
      code: 'enterprise',
      description: 'Unlimited access for large educational networks',
      monthly_price: 19999,
      annual_price: 199990,
      student_limit: 5000,
      teacher_limit: 500,
      admin_limit: 20,
      features: 'All Pro Features, Dedicated Support, Custom Branding, API Access',
      status: 'active',
    },
  ]);

  // 2. Institutes
  await supabase.from('institutes').insert([
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Apex International Academy',
      code: 'APEX01',
      address: '123 Education Boulevard, Tech Park',
      city: 'Bangalore',
      state_region: 'Karnataka',
      country: 'India',
      postal_code: '560001',
      phone: '+91 9876543210',
      email: 'info@apexacademy.edu',
      status: 'active',
      student_limit: 500,
      teacher_limit: 50,
      admin_limit: 5,
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      name: 'Zenith Coaching Institute',
      code: 'ZENITH01',
      address: '45 Knowledge Hub, Sector 18',
      city: 'Gurugram',
      state_region: 'Haryana',
      country: 'India',
      postal_code: '122001',
      phone: '+91 9812345678',
      email: 'contact@zenithedu.com',
      status: 'active',
      student_limit: 200,
      teacher_limit: 20,
      admin_limit: 3,
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      name: 'Horizon Training Academy',
      code: 'HORIZON01',
      address: '78 Science City Road',
      city: 'Ahmedabad',
      state_region: 'Gujarat',
      country: 'India',
      postal_code: '380060',
      phone: '+91 9898989898',
      email: 'admin@horizon.edu',
      status: 'suspended',
      student_limit: 100,
      teacher_limit: 10,
      admin_limit: 2,
    },
  ]);

  // Subscriptions
  await supabase.from('institute_subscriptions').insert([
    {
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      plan_id: 'f0000000-0000-0000-0000-000000000002',
      status: 'active',
      start_date: '2026-01-01',
      expiry_date: '2027-01-01',
    },
    {
      institute_id: 'b0000000-0000-0000-0000-000000000002',
      plan_id: 'f0000000-0000-0000-0000-000000000001',
      status: 'active',
      start_date: '2026-02-01',
      expiry_date: '2026-08-01',
    },
    {
      institute_id: 'b0000000-0000-0000-0000-000000000003',
      plan_id: 'f0000000-0000-0000-0000-000000000001',
      status: 'suspended',
      start_date: '2025-01-01',
      expiry_date: '2026-01-01',
    },
  ]);

  // Grading Rules for APEX01
  await supabase.from('grading_rules').insert([
    { institute_id: 'b0000000-0000-0000-0000-000000000001', min_percentage: 90, max_percentage: 100, grade: 'A+' },
    { institute_id: 'b0000000-0000-0000-0000-000000000001', min_percentage: 80, max_percentage: 89.99, grade: 'A' },
    { institute_id: 'b0000000-0000-0000-0000-000000000001', min_percentage: 70, max_percentage: 79.99, grade: 'B' },
    { institute_id: 'b0000000-0000-0000-0000-000000000001', min_percentage: 60, max_percentage: 69.99, grade: 'C' },
    { institute_id: 'b0000000-0000-0000-0000-000000000001', min_percentage: 50, max_percentage: 59.99, grade: 'D' },
    { institute_id: 'b0000000-0000-0000-0000-000000000001', min_percentage: 0, max_percentage: 49.99, grade: 'F' },
  ]);

  // Super Admin User
  await supabase.from('users').insert({
    id: 'a0000000-0000-0000-0000-000000000001',
    institute_id: null,
    role: 'super_admin',
    username: 'superadmin',
    email: 'superadmin@example.com',
    password_hash: defaultPasswordHash,
    first_name: 'Super',
    last_name: 'Admin',
    is_active: true,
  });

  // Institute Admin APEX01
  await supabase.from('users').insert({
    id: 'a0000000-0000-0000-0000-000000000002',
    institute_id: 'b0000000-0000-0000-0000-000000000001',
    role: 'institute_admin',
    username: 'admin',
    email: 'admin@apexacademy.edu',
    password_hash: defaultPasswordHash,
    first_name: 'Dr. Rajesh',
    last_name: 'Sharma',
    phone: '+91 9876543211',
    is_active: true,
  });

  // Institute Admin ZENITH01
  await supabase.from('users').insert({
    id: 'a0000000-0000-0000-0000-000000000003',
    institute_id: 'b0000000-0000-0000-0000-000000000002',
    role: 'institute_admin',
    username: 'zenith_admin',
    email: 'admin@zenithedu.com',
    password_hash: defaultPasswordHash,
    first_name: 'Amitabh',
    last_name: 'Bhattacharya',
    phone: '+91 9812345600',
    is_active: true,
  });

  // Teachers for APEX01
  const teachersList = [
    { name: 'Vikram Mehta', username: 'teacher_physics', sub: 'Physics', qual: 'M.Sc. Physics', code: 'EMP-PHY-01' },
    { name: 'Sunita Rao', username: 'teacher_math', sub: 'Mathematics', qual: 'Ph.D. Math', code: 'EMP-MTH-02' },
    { name: 'Anil Kulkarni', username: 'teacher_chem', sub: 'Chemistry', qual: 'M.Sc. Chemistry', code: 'EMP-CHM-03' },
    { name: 'Kavita Pandey', username: 'teacher_bio', sub: 'Biology', qual: 'M.Sc. Botany', code: 'EMP-BIO-04' },
    { name: 'Robert Dsouza', username: 'teacher_eng', sub: 'English', qual: 'M.A. English Literature', code: 'EMP-ENG-05' },
  ];

  const createdTeacherProfiles = [];

  for (let i = 0; i < teachersList.length; i++) {
    const t = teachersList[i];
    const parts = t.name.split(' ');
    const userId = `a0000000-0000-0000-0000-0000000000${10 + i}`;

    const { data: u } = await supabase.from('users').insert({
      id: userId,
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      role: 'teacher',
      username: t.username,
      email: `${t.username}@apexacademy.edu`,
      password_hash: defaultPasswordHash,
      first_name: parts[0],
      last_name: parts[1],
      is_active: true,
    }).select().single();

    const { data: tp } = await supabase.from('teachers').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      user_id: u.id,
      employee_id: t.code,
      first_name: parts[0],
      last_name: parts[1],
      email: `${t.username}@apexacademy.edu`,
      phone: `+91 98765432${20 + i}`,
      qualification: t.qual,
      specialization: t.sub,
      joining_date: '2020-06-01',
      is_active: true,
    }).select().single();

    createdTeacherProfiles.push(tp);
  }

  // Batches for APEX01
  const batchesData = [
    { id: 'c0000000-0000-0000-0000-000000000001', name: 'Grade 10 - Science & Math A', code: 'G10-A-2026', capacity: 35 },
    { id: 'c0000000-0000-0000-0000-000000000002', name: 'Grade 10 - Science & Math B', code: 'G10-B-2026', capacity: 35 },
    { id: 'c0000000-0000-0000-0000-000000000003', name: 'Grade 12 - Senior Physics & Chem', code: 'G12-PHY-2026', capacity: 40 },
    { id: 'c0000000-0000-0000-0000-000000000004', name: 'Grade 11 - Biology & Bio-Chem', code: 'G11-BIO-2026', capacity: 30 },
  ];

  for (const b of batchesData) {
    await supabase.from('batches').insert({
      id: b.id,
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      name: b.name,
      code: b.code,
      academic_year: '2025-2026',
      start_date: '2025-06-01',
      end_date: '2026-04-30',
      start_time: '08:30 AM',
      end_time: '02:30 PM',
      capacity: b.capacity,
      is_active: true,
    });
  }

  // Subjects for APEX01
  const subjectsData = [
    { id: 'f2000000-0000-0000-0000-000000000001', name: 'Physics', code: 'PHY101', max: 100, pass: 40 },
    { id: 'f2000000-0000-0000-0000-000000000002', name: 'Mathematics', code: 'MTH101', max: 100, pass: 40 },
    { id: 'f2000000-0000-0000-0000-000000000003', name: 'Chemistry', code: 'CHM101', max: 100, pass: 40 },
    { id: 'f2000000-0000-0000-0000-000000000004', name: 'Biology', code: 'BIO101', max: 100, pass: 40 },
    { id: 'f2000000-0000-0000-0000-000000000005', name: 'English Literature', code: 'ENG101', max: 100, pass: 40 },
  ];

  for (const s of subjectsData) {
    await supabase.from('subjects').insert({
      id: s.id,
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      name: s.name,
      code: s.code,
      max_marks: s.max,
      passing_marks: s.pass,
      is_active: true,
    });
  }

  // Assign Teachers to Batches & Subjects
  for (let i = 0; i < createdTeacherProfiles.length; i++) {
    const tp = createdTeacherProfiles[i];
    await supabase.from('teacher_batch').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      teacher_id: tp.id,
      batch_id: batchesData[i % batchesData.length].id,
    });
    await supabase.from('teacher_subject').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      teacher_id: tp.id,
      subject_id: subjectsData[i].id,
    });
  }

  // 15 Students & 15 Parents
  const studentMaster = [
    { first: 'Aarav', last: 'Verma', username: 'aarav' },
    { first: 'Ananya', last: 'Iyer', username: 'ananya' },
    { first: 'Rohan', last: 'Gupta', username: 'rohan' },
    { first: 'Priya', last: 'Nair', username: 'priya' },
    { first: 'Siddharth', last: 'Deshmukh', username: 'siddharth' },
    { first: 'Isha', last: 'Patel', username: 'isha' },
    { first: 'Kabir', last: 'Singh', username: 'kabir' },
    { first: 'Diya', last: 'Sharma', username: 'diya' },
    { first: 'Arjun', last: 'Reddy', username: 'arjun' },
    { first: 'Myra', last: 'Kapoor', username: 'myra' },
    { first: 'Vivaan', last: 'Joshi', username: 'vivaan' },
    { first: 'Avani', last: 'Chawla', username: 'avani' },
    { first: 'Aditya', last: 'Bhat', username: 'aditya' },
    { first: 'Tara', last: 'Saxena', username: 'tara' },
    { first: 'Yash', last: 'Trivedi', username: 'yash' },
  ];

  const parentMaster = [
    { first: 'Suresh', last: 'Verma', username: 'parent_suresh' },
    { first: 'Ramesh', last: 'Iyer', username: 'parent_ramesh' },
    { first: 'Deepak', last: 'Gupta', username: 'parent_deepak' },
    { first: 'Vinod', last: 'Nair', username: 'parent_vinod' },
    { first: 'Mahesh', last: 'Deshmukh', username: 'parent_mahesh' },
    { first: 'Pankaj', last: 'Patel', username: 'parent_pankaj' },
    { first: 'Gurpreet', last: 'Singh', username: 'parent_gurpreet' },
    { first: 'Ashok', last: 'Sharma', username: 'parent_ashok' },
    { first: 'Venkat', last: 'Reddy', username: 'parent_venkat' },
    { first: 'Sameer', last: 'Kapoor', username: 'parent_sameer' },
    { first: 'Nitin', last: 'Joshi', username: 'parent_nitin' },
    { first: 'Harish', last: 'Chawla', username: 'parent_harish' },
    { first: 'Ganesh', last: 'Bhat', username: 'parent_ganesh' },
    { first: 'Rajiv', last: 'Saxena', username: 'parent_rajiv' },
    { first: 'Alok', last: 'Trivedi', username: 'parent_alok' },
  ];

  const createdStudents = [];

  for (let i = 0; i < studentMaster.length; i++) {
    const sInfo = studentMaster[i];
    const pInfo = parentMaster[i];

    // Student User
    const { data: sUser } = await supabase.from('users').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      role: 'student',
      username: sInfo.username,
      email: `${sInfo.username}@apexacademy.edu`,
      password_hash: defaultPasswordHash,
      first_name: sInfo.first,
      last_name: sInfo.last,
      is_active: true,
    }).select().single();

    // Student Profile
    const { data: sProf } = await supabase.from('students').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      user_id: sUser.id,
      student_id: `STU-2026-${String(i + 1).padStart(2, '0')}`,
      admission_number: `ADM-2026-${String(i + 1).padStart(2, '0')}`,
      first_name: sInfo.first,
      last_name: sInfo.last,
      email: `${sInfo.username}@apexacademy.edu`,
      phone: `+91 980000${String(10 + i).padStart(4, '0')}`,
      date_of_birth: '2010-05-15',
      gender: i % 2 === 0 ? 'male' : 'female',
      admission_date: '2025-06-01',
      academic_year: '2025-2026',
      emergency_contact_name: `${pInfo.first} ${pInfo.last}`,
      emergency_contact_phone: `+91 981110${String(10 + i).padStart(4, '0')}`,
      is_active: true,
    }).select().single();

    createdStudents.push(sProf);

    // Parent User
    const { data: pUser } = await supabase.from('users').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      role: 'parent',
      username: pInfo.username,
      email: `${pInfo.username}@gmail.com`,
      password_hash: defaultPasswordHash,
      first_name: pInfo.first,
      last_name: pInfo.last,
      phone: `+91 981110${String(10 + i).padStart(4, '0')}`,
      is_active: true,
    }).select().single();

    // Parent Profile
    const { data: pProf } = await supabase.from('parents').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      user_id: pUser.id,
      first_name: pInfo.first,
      last_name: pInfo.last,
      email: `${pInfo.username}@gmail.com`,
      phone: `+91 981110${String(10 + i).padStart(4, '0')}`,
      relationship: 'Father',
      occupation: 'Professional',
      is_active: true,
    }).select().single();

    // Link Parent & Student
    await supabase.from('parent_student').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      parent_id: pProf.id,
      student_id: sProf.id,
    });

    // Enroll in Batch
    const batchId = batchesData[i % batchesData.length].id;
    await supabase.from('student_batch').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      student_id: sProf.id,
      batch_id: batchId,
      roll_number: `ROLL-${String(i + 1).padStart(2, '0')}`,
    });
  }

  // Attendance Records across 10 dates
  const attendanceDates = [
    '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19',
    '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'
  ];

  for (let dIdx = 0; dIdx < attendanceDates.length; dIdx++) {
    const date = attendanceDates[dIdx];
    for (let sIdx = 0; sIdx < createdStudents.length; sIdx++) {
      const student = createdStudents[sIdx];
      const batchId = batchesData[sIdx % batchesData.length].id;
      const status = (sIdx + dIdx) % 7 === 6 ? 'absent' : (sIdx + dIdx) % 7 === 5 ? 'late' : 'present';
      await supabase.from('attendance').insert({
        institute_id: 'b0000000-0000-0000-0000-000000000001',
        student_id: student.id,
        batch_id: batchId,
        date: date,
        status: status,
        remarks: status === 'absent' ? 'Sick leave' : status === 'late' ? 'Bus delay' : null,
        marked_by: 'a0000000-0000-0000-0000-000000000010',
      });
    }
  }

  // Fee Categories & Structures
  const { data: feeCat1 } = await supabase.from('fee_categories').insert({
    institute_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Annual Tuition Fee 2025-26',
    code: 'TUI-2026',
    description: 'Core annual academic tuition fee',
    is_active: true,
  }).select().single();

  const { data: feeStruct1 } = await supabase.from('fee_structures').insert({
    institute_id: 'b0000000-0000-0000-0000-000000000001',
    category_id: feeCat1.id,
    batch_id: batchesData[0].id,
    amount: 15000,
    due_date: '2026-08-15',
    is_active: true,
  }).select().single();

  for (let i = 0; i < createdStudents.length; i++) {
    const student = createdStudents[i];
    const isPaid = i % 3 === 0;
    const isPartial = i % 3 === 1;
    const paidAmount = isPaid ? 15000 : isPartial ? 6000 : 0;
    const balanceAmount = 15000 - paidAmount;
    const status = isPaid ? 'paid' : 'pending';

    const { data: sf } = await supabase.from('student_fees').insert({
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      student_id: student.id,
      structure_id: feeStruct1.id,
      category_id: feeCat1.id,
      total_amount: 15000,
      paid_amount: paidAmount,
      balance_amount: balanceAmount,
      due_date: '2026-08-15',
      status: status,
    }).select().single();

    if (paidAmount > 0) {
      await supabase.from('fee_payments').insert({
        institute_id: 'b0000000-0000-0000-0000-000000000001',
        student_id: student.id,
        student_fee_id: sf.id,
        receipt_number: `RCP-2026-${String(i + 1).padStart(3, '0')}`,
        amount_paid: paidAmount,
        payment_date: '2026-07-10',
        payment_method: 'online',
        reference_number: `PAY-UPI-9876${i}`,
        is_reversed: false,
      });
    }
  }

  // Exams with Explicit Fixed UUIDs
  const { data: exam1 } = await supabase.from('exams').insert({
    id: 'e1000000-0000-0000-0000-000000000001',
    institute_id: 'b0000000-0000-0000-0000-000000000001',
    batch_id: batchesData[0].id,
    name: 'Mid-Term Assessment 2026',
    code: 'MID-2026',
    academic_year: '2025-2026',
    start_date: '2026-07-01',
    end_date: '2026-07-05',
    status: 'published',
    description: 'Comprehensive mid-term offline examination',
  }).select().single();

  const { data: exam2 } = await supabase.from('exams').insert({
    id: 'e1000000-0000-0000-0000-000000000002',
    institute_id: 'b0000000-0000-0000-0000-000000000001',
    batch_id: batchesData[0].id,
    name: 'Quarterly Unit Test 1',
    code: 'UNIT-Q1',
    academic_year: '2025-2026',
    start_date: '2026-05-10',
    end_date: '2026-05-15',
    status: 'published',
    description: 'First quarterly unit evaluation test',
  }).select().single();

  const subIds = subjectsData.map(s => s.id);

  const scorePatterns = [
    [92, 88, 95, 90, 89],
    [82, 85, 78, 80, 84],
    [65, 70, 68, 72, 69],
    [55, 58, 60, 62, 59],
    [42, 38, 45, 48, 50],
    [88, 91, 86, 94, 90],
    [75, 78, 72, 80, 77],
    [95, 96, 92, 98, 94],
    [60, 64, 62, 58, 66],
    [50, 52, 55, 49, 53],
    [84, 87, 82, 86, 85],
    [71, 74, 70, 76, 73],
    [91, 94, 89, 93, 92],
    [45, 42, 48, 40, 46],
    [78, 80, 82, 85, 81],
  ];

  for (let i = 0; i < createdStudents.length; i++) {
    const student = createdStudents[i];
    const studentScores = scorePatterns[i];

    for (let subIdx = 0; subIdx < subIds.length; subIdx++) {
      const obt = studentScores[subIdx];
      const pct = (obt / 100) * 100;
      let grade = 'F';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 80) grade = 'A';
      else if (pct >= 70) grade = 'B';
      else if (pct >= 60) grade = 'C';
      else if (pct >= 50) grade = 'D';

      // Insert Mid-Term marks
      await supabase.from('marks').insert({
        institute_id: 'b0000000-0000-0000-0000-000000000001',
        student_id: student.id,
        exam_id: exam1.id,
        subject_id: subIds[subIdx],
        max_marks: 100,
        obtained_marks: obt,
        grade: grade,
        percentage: pct,
        is_pass: pct >= 40,
        remarks: pct >= 80 ? 'Outstanding work' : pct >= 50 ? 'Good effort' : 'Needs attention',
        entered_by: 'a0000000-0000-0000-0000-000000000010',
        is_published: true,
      });

      // Insert Quarterly Unit test marks
      const unitObt = Math.min(100, obt + (i % 2 === 0 ? 3 : -2));
      const unitPct = unitObt;
      let unitGrade = 'F';
      if (unitPct >= 90) unitGrade = 'A+';
      else if (unitPct >= 80) unitGrade = 'A';
      else if (unitPct >= 70) unitGrade = 'B';
      else if (unitPct >= 60) unitGrade = 'C';
      else if (unitPct >= 50) unitGrade = 'D';

      await supabase.from('marks').insert({
        institute_id: 'b0000000-0000-0000-0000-000000000001',
        student_id: student.id,
        exam_id: exam2.id,
        subject_id: subIds[subIdx],
        max_marks: 100,
        obtained_marks: unitObt,
        grade: unitGrade,
        percentage: unitPct,
        is_pass: unitPct >= 40,
        remarks: 'Quarterly evaluation',
        entered_by: 'a0000000-0000-0000-0000-000000000010',
        is_published: true,
      });
    }
  }

  // Notifications
  await supabase.from('notifications').insert([
    {
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      user_id: 'a0000000-0000-0000-0000-000000000002',
      title: 'Welcome to Apex International Academy',
      message: 'Your institute dashboard has been loaded with complete academic data.',
      type: 'info',
      is_read: false,
    },
    {
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      user_id: 'a0000000-0000-0000-0000-000000000020',
      title: 'Mid-Term Results Published',
      message: 'Your Mid-Term Assessment 2026 mark sheet is now ready to view & print.',
      type: 'success',
      is_read: false,
    },
  ]);

  // Activity Logs
  await supabase.from('activity_logs').insert([
    {
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      user_id: 'a0000000-0000-0000-0000-000000000002',
      action: 'exam.published',
      entity_type: 'exam',
      entity_id: exam1.id,
    },
    {
      institute_id: 'b0000000-0000-0000-0000-000000000001',
      user_id: 'a0000000-0000-0000-0000-000000000010',
      action: 'attendance.marked',
      entity_type: 'attendance',
    },
  ]);

  console.log('🎉 Comprehensive database seeding finished successfully!');
}

seedMore().catch(console.error);
