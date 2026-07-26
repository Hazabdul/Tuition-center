const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Parse .env manually
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wwwanas643_db_user:anasmohd111@cluster0.aoa1asx.mongodb.net/tuition_center?retryWrites=true&w=majority&tlsAllowInvalidCertificates=true';

async function seedExcelInstitute() {
  console.log('🌱 Seeding Excel Elite Academy (EXCEL) with deterministic Institute ID...');
  await mongoose.connect(MONGODB_URI, { dbName: 'tuition_center' });
  const db = mongoose.connection.db;

  const passwordHash = await bcrypt.hash('Password@123', 10);
  const now = new Date();

  // FIXED Institute ID to ensure all user tokens & collections remain in 100% sync
  const instId = new mongoose.Types.ObjectId('6a65d21ce9e6bb97bd397cbc');

  // Purge any existing collections for EXCEL
  await db.collection('institutes').deleteMany({ $or: [{ code: 'EXCEL' }, { _id: instId }] });
  await db.collection('users').deleteMany({ instituteId: instId });
  await db.collection('teachers').deleteMany({ instituteId: instId });
  await db.collection('students').deleteMany({ instituteId: instId });
  await db.collection('parents').deleteMany({ instituteId: instId });
  await db.collection('batches').deleteMany({ instituteId: instId });
  await db.collection('subjects').deleteMany({ instituteId: instId });
  await db.collection('gradingrules').deleteMany({ instituteId: instId });

  // 1. Create Institute
  await db.collection('institutes').insertOne({
    _id: instId,
    name: 'Excel Elite Academy',
    code: 'EXCEL',
    email: 'admin@excelacademy.edu',
    phone: '+91 98765 00000',
    address: '123 Education Hub, Sector 4, MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560001',
    website: 'https://excelacademy.edu',
    status: 'active',
    studentLimit: 200,
    teacherLimit: 20,
    subscriptionPlan: 'Enterprise Plan',
    subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Create Institute Admin User
  const adminUserId = new mongoose.Types.ObjectId();
  await db.collection('users').insertOne({
    _id: adminUserId,
    instituteId: instId,
    role: 'institute_admin',
    username: 'excel_admin',
    email: 'admin@excelacademy.edu',
    phone: '+91 98765 00001',
    passwordHash,
    firstName: 'Vikramaditya',
    lastName: 'Shah',
    isActive: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Create 5 Teachers & User accounts
  const teacherDocs = [];
  const teacherUserIds = [];
  const teacherDefs = [
    { fn: 'Dr. Ramesh', ln: 'Mehta', emp: 'EMP-EXC-001', spec: 'Physics XI', user: 'teacher_physics', email: 'physics@excel.edu' },
    { fn: 'Prof. Sunita', ln: 'Rao', emp: 'EMP-EXC-002', spec: 'Chemistry XI', user: 'teacher_chemistry', email: 'chemistry@excel.edu' },
    { fn: 'Mr. Alok', ln: 'Verma', emp: 'EMP-EXC-003', spec: 'Mathematics XI', user: 'teacher_maths', email: 'maths@excel.edu' },
    { fn: 'Dr. Anita', ln: 'Desai', emp: 'EMP-EXC-004', spec: 'Biology XI', user: 'teacher_biology', email: 'biology@excel.edu' },
    { fn: 'Mr. Rajesh', ln: 'Patel', emp: 'EMP-EXC-005', spec: 'Computer Science XI', user: 'teacher_cs', email: 'cs@excel.edu' },
  ];

  for (const t of teacherDefs) {
    const uId = new mongoose.Types.ObjectId();
    teacherUserIds.push(uId);
    await db.collection('users').insertOne({
      _id: uId,
      instituteId: instId,
      role: 'teacher',
      username: t.user,
      email: t.email,
      phone: '+91 98111 22233',
      passwordHash,
      firstName: t.fn,
      lastName: t.ln,
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const tId = new mongoose.Types.ObjectId();
    teacherDocs.push({
      _id: tId,
      instituteId: instId,
      userId: uId,
      teacherId: t.emp,
      employeeId: t.emp,
      firstName: t.fn,
      lastName: t.ln,
      email: t.email,
      phone: '+91 98111 22233',
      qualification: 'M.Sc, B.Ed / Ph.D',
      specialization: t.spec,
      joiningDate: new Date('2023-06-01'),
      address: 'Bangalore Academic Quarters',
      notes: 'Senior faculty member',
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection('teachers').insertMany(teacherDocs);

  // 4. Create 5 Subjects
  const subjectDocs = [];
  const subjectDefs = [
    { name: 'Physics XI', code: 'PHY101', max: 100, pass: 35 },
    { name: 'Chemistry XI', code: 'CHE101', max: 100, pass: 35 },
    { name: 'Mathematics XI', code: 'MAT101', max: 100, pass: 35 },
    { name: 'Biology XI', code: 'BIO101', max: 100, pass: 35 },
    { name: 'Computer Science XI', code: 'CS101', max: 100, pass: 35 },
  ];
  for (let i = 0; i < subjectDefs.length; i++) {
    const sDef = subjectDefs[i];
    subjectDocs.push({
      _id: new mongoose.Types.ObjectId(),
      instituteId: instId,
      name: sDef.name,
      code: sDef.code,
      description: `Course for ${sDef.name}`,
      maxMarks: sDef.max,
      passingMarks: sDef.pass,
      teacherId: teacherDocs[i]._id,
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection('subjects').insertMany(subjectDocs);

  // 5. Create 20 Parents
  const parentDocs = [];
  const firstNames = ['Suresh', 'Ramesh', 'Vijay', 'Pankaj', 'Venkat', 'Rajiv', 'Pradeep', 'Subramanian', 'Anand', 'Dipankar', 'Mahesh', 'Sunil', 'Rakesh', 'Alok', 'Narayana', 'Ganesh', 'Ashok', 'Nitin', 'Dinesh', 'Bimal'];
  const lastNames = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Nair', 'Malhotra', 'Reddy', 'Iyer', 'Joshi', 'Chowdhury', 'Singh', 'Kumar', 'Kapoor', 'Mehta', 'Rao', 'Bhat', 'Deshmukh', 'Kulkarni', 'Agarwal', 'Banerjee'];

  for (let i = 1; i <= 20; i++) {
    const uId = new mongoose.Types.ObjectId();
    const fn = firstNames[i - 1];
    const ln = lastNames[i - 1];
    await db.collection('users').insertOne({
      _id: uId,
      instituteId: instId,
      role: 'parent',
      username: `parent_${i < 10 ? '0' + i : i}`,
      email: `parent_${i}@excel.edu`,
      phone: `+91 98222 ${10000 + i}`,
      passwordHash,
      firstName: fn,
      lastName: ln,
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    parentDocs.push({
      _id: new mongoose.Types.ObjectId(),
      instituteId: instId,
      userId: uId,
      firstName: fn,
      lastName: ln,
      email: `parent_${i}@excel.edu`,
      phone: `+91 98222 ${10000 + i}`,
      relationship: 'father',
      occupation: 'Professional',
      address: `House #${i * 12}, Brigade Road, Bengaluru`,
      children: [],
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection('parents').insertMany(parentDocs);

  // 6. Create 50 Students & link to parents
  const studentDocs = [];
  const studentFirstNames = [
    'Aarav', 'Ananya', 'Rohan', 'Diya', 'Ishan', 'Sanya', 'Kabir', 'Meera', 'Aditya', 'Priya',
    'Dev', 'Kavya', 'Arjun', 'Neha', 'Yash', 'Riya', 'Vihaan', 'Tanvi', 'Rahul', 'Sneha',
    'Karan', 'Pooja', 'Siddharth', 'Ishita', 'Varun', 'Shruti', 'Aman', 'Nisha', 'Nikhil', 'Shreya',
    'Akash', 'Swati', 'Manish', 'Preeti', 'Vikram', 'Divya', 'Gaurav', 'Deepika', 'Amit', 'Anjali',
    'Sameer', 'Monika', 'Rajesh', 'Bhavna', 'Sanjay', 'Tarun', 'Anushka', 'Harsh', 'Radhika', 'Kunal'
  ];

  for (let i = 1; i <= 50; i++) {
    const fn = studentFirstNames[i - 1];
    const parentIdx = (i - 1) % 20;
    const parent = parentDocs[parentIdx];
    const fatherFullName = `${parent.firstName} ${parent.lastName}`;
    const sIdStr = `EXC-STU-${String(i).padStart(3, '0')}`;
    const admNum = `ADM-2025-${String(i).padStart(3, '0')}`;

    const uId = new mongoose.Types.ObjectId();
    await db.collection('users').insertOne({
      _id: uId,
      instituteId: instId,
      role: 'student',
      username: `student_${i < 10 ? '0' + i : i}`,
      email: `student_${i < 10 ? '0' + i : i}@excel.edu`,
      phone: `+91 98333 ${20000 + i}`,
      studentId: sIdStr,
      passwordHash,
      firstName: fn,
      lastName: parent.lastName,
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const stObjId = new mongoose.Types.ObjectId();
    studentDocs.push({
      _id: stObjId,
      instituteId: instId,
      userId: uId,
      studentId: sIdStr,
      admissionNumber: admNum,
      firstName: fn,
      lastName: parent.lastName,
      fatherName: fatherFullName,
      dateOfBirth: new Date('2007-05-15'),
      gender: i % 2 === 0 ? 'female' : 'male',
      email: `student_${i < 10 ? '0' + i : i}@excel.edu`,
      phone: `+91 98333 ${20000 + i}`,
      address: parent.address,
      academicYear: '2025-2026',
      emergencyContactName: fatherFullName,
      emergencyContactPhone: parent.phone,
      notes: 'Enrolled in 2025 Science Batch',
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // Push child reference to parent
    await db.collection('parents').updateOne(
      { _id: parent._id },
      { $addToSet: { children: stObjId } }
    );
  }
  await db.collection('students').insertMany(studentDocs);

  // 7. Create 2 Batches & assign students & teachers
  const batch1Students = studentDocs.slice(0, 25).map(s => s._id);
  const batch2Students = studentDocs.slice(25, 50).map(s => s._id);
  const allTeacherObjIds = teacherDocs.map(t => t._id);
  const allSubjectObjIds = subjectDocs.map(s => s._id);

  const batch1Id = new mongoose.Types.ObjectId();
  const batch2Id = new mongoose.Types.ObjectId();

  await db.collection('batches').insertMany([
    {
      _id: batch1Id,
      instituteId: instId,
      name: 'Grade 11 Science (Batch A)',
      code: '11-SCI-A',
      description: 'Morning Batch for 11th Grade Science Students',
      academicYear: '2025-2026',
      capacity: 30,
      maxStudents: 30,
      students: batch1Students,
      teachers: allTeacherObjIds,
      subjects: allSubjectObjIds,
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: batch2Id,
      instituteId: instId,
      name: 'Grade 12 Science (Batch B)',
      code: '12-SCI-B',
      description: 'Afternoon Batch for 12th Grade Science Students',
      academicYear: '2025-2026',
      capacity: 30,
      maxStudents: 30,
      students: batch2Students,
      teachers: allTeacherObjIds,
      subjects: allSubjectObjIds,
      isActive: true,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Update teacher batch references
  for (const t of teacherDocs) {
    await db.collection('teachers').updateOne(
      { _id: t._id },
      { $set: { batches: [batch1Id, batch2Id], subjects: allSubjectObjIds } }
    );
  }

  // 8. Seed Default Grading Rules
  await db.collection('gradingrules').insertMany([
    { instituteId: instId, grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0, description: 'Outstanding', isPassing: true, createdAt: now, updatedAt: now },
    { instituteId: instId, grade: 'A', minPercentage: 80, maxPercentage: 89, gpa: 3.7, description: 'Excellent', isPassing: true, createdAt: now, updatedAt: now },
    { instituteId: instId, grade: 'B', minPercentage: 70, maxPercentage: 79, gpa: 3.0, description: 'Very Good', isPassing: true, createdAt: now, updatedAt: now },
    { instituteId: instId, grade: 'C', minPercentage: 60, maxPercentage: 69, gpa: 2.0, description: 'Good', isPassing: true, createdAt: now, updatedAt: now },
    { instituteId: instId, grade: 'D', minPercentage: 50, maxPercentage: 59, gpa: 1.0, description: 'Satisfactory', isPassing: true, createdAt: now, updatedAt: now },
    { instituteId: instId, grade: 'F', minPercentage: 0, maxPercentage: 49, gpa: 0.0, description: 'Needs Improvement', isPassing: false, createdAt: now, updatedAt: now },
  ]);

  console.log('✅ Excel Elite Academy (EXCEL) successfully seeded with FIXED Institute ID 6a65d21ce9e6bb97bd397cbc!');
  process.exit(0);
}

seedExcelInstitute().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
