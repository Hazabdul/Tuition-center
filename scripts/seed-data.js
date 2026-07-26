const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

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
} catch (e) {
  // fallback
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tuition_center';

async function seedData() {
  console.log('🌱 Starting comprehensive System Admin & Multi-Tenant database seeding...');

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000, family: 4 });
  const db = mongoose.connection.db;

  // Clear all collections
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
  console.log('✅ Cleared all existing MongoDB collections.');

  const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);
  const now = new Date();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  // 1. Subscription Plans
  const starterPlanId = new mongoose.Types.ObjectId();
  const proPlanId = new mongoose.Types.ObjectId();
  const enterprisePlanId = new mongoose.Types.ObjectId();

  await db.collection('subscriptionplans').insertMany([
    {
      _id: starterPlanId,
      name: 'Starter Tier',
      code: 'starter',
      description: 'Ideal for small coaching centres & local tuition hubs',
      monthlyPrice: 2999,
      annualPrice: 29990,
      studentLimit: 100,
      teacherLimit: 10,
      adminLimit: 2,
      features: ['Attendance Management', 'Basic Fee Collection', 'Offline Exam Marks', 'Basic Reports'],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: proPlanId,
      name: 'Professional Academy',
      code: 'pro',
      description: 'Ideal for medium schools and growing institutions',
      monthlyPrice: 7999,
      annualPrice: 79990,
      studentLimit: 500,
      teacherLimit: 50,
      adminLimit: 5,
      features: ['All Starter Features', 'Online Payments', 'Parent Portal', 'Custom Grading', 'SMS Alerts'],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: enterprisePlanId,
      name: 'Enterprise Chain',
      code: 'enterprise',
      description: 'Full feature suite for large multi-branch institute chains',
      monthlyPrice: 19999,
      annualPrice: 199990,
      studentLimit: 5000,
      teacherLimit: 250,
      adminLimit: 20,
      features: ['All Pro Features', 'Dedicated Account Manager', 'API Access', 'Custom Domain', 'White-label Branding'],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log('✅ Inserted Subscription Plans.');

  // 2. Institutes (Active, Pending, Suspended, Inactive)
  const inst1Id = new mongoose.Types.ObjectId(); // APEX
  const inst2Id = new mongoose.Types.ObjectId(); // ZENITH
  const inst3Id = new mongoose.Types.ObjectId(); // NARAYANA
  const inst4Id = new mongoose.Types.ObjectId(); // PINNACLE
  const inst5Id = new mongoose.Types.ObjectId(); // HORIZON

  await db.collection('institutes').insertMany([
    {
      _id: inst1Id,
      name: 'Apex Coaching Academy',
      code: 'APEX',
      email: 'contact@apexcoaching.edu',
      phone: '+91 98765 43210',
      address: '123 MG Road, Koramangala',
      city: 'Bengaluru',
      stateRegion: 'Karnataka',
      country: 'India',
      postalCode: '560034',
      status: 'active',
      studentLimit: 500,
      teacherLimit: 50,
      adminLimit: 5,
      contactPersonName: 'Rajesh Sharma',
      contactPersonPhone: '+91 98765 43210',
      contactPersonEmail: 'admin@apexcoaching.edu',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: inst2Id,
      name: 'Zenith Scholars Institute',
      code: 'ZENITH',
      email: 'info@zenithscholars.com',
      phone: '+91 98765 12345',
      address: '45 Park Street',
      city: 'Kolkata',
      stateRegion: 'West Bengal',
      country: 'India',
      postalCode: '700016',
      status: 'active',
      studentLimit: 100,
      teacherLimit: 10,
      adminLimit: 2,
      contactPersonName: 'Ananya Chatterjee',
      contactPersonPhone: '+91 98765 12345',
      contactPersonEmail: 'admin@zenithscholars.com',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: inst3Id,
      name: 'Narayana Science Academy',
      code: 'NARAYANA',
      email: 'info@narayanascience.edu',
      phone: '+91 91234 56789',
      address: '88 Jubilee Hills',
      city: 'Hyderabad',
      stateRegion: 'Telangana',
      country: 'India',
      postalCode: '500033',
      status: 'active',
      studentLimit: 5000,
      teacherLimit: 250,
      adminLimit: 20,
      contactPersonName: 'Kalyan Rao',
      contactPersonPhone: '+91 91234 56789',
      contactPersonEmail: 'kalyan@narayanascience.edu',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: inst4Id,
      name: 'Pinnacle Learning Hub',
      code: 'PINNACLE',
      email: 'admissions@pinnaclehub.org',
      phone: '+91 99887 76655',
      address: '12 FC Road, Shivaji Nagar',
      city: 'Pune',
      stateRegion: 'Maharashtra',
      country: 'India',
      postalCode: '411004',
      status: 'pending_activation',
      studentLimit: 500,
      teacherLimit: 50,
      adminLimit: 5,
      contactPersonName: 'Amitabh Joshi',
      contactPersonPhone: '+91 99887 76655',
      contactPersonEmail: 'admin@pinnaclehub.org',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: inst5Id,
      name: 'Horizon Tutorials',
      code: 'HORIZON',
      email: 'support@horizontutorials.in',
      phone: '+91 97766 55443',
      address: '67 Hazratganj',
      city: 'Lucknow',
      stateRegion: 'Uttar Pradesh',
      country: 'India',
      postalCode: '226001',
      status: 'suspended',
      studentLimit: 100,
      teacherLimit: 10,
      adminLimit: 2,
      contactPersonName: 'Priya Srivastava',
      contactPersonPhone: '+91 97766 55443',
      contactPersonEmail: 'priya@horizontutorials.in',
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log('✅ Inserted 5 Institutes with diverse statuses.');

  // 3. Subscriptions (Active, Pending, Expiring Soon)
  await db.collection('institutesubscriptions').insertMany([
    {
      instituteId: inst1Id,
      planId: proPlanId,
      status: 'active',
      startDate: new Date('2026-01-01'),
      expiryDate: oneYearFromNow,
      createdAt: now,
      updatedAt: now,
    },
    {
      instituteId: inst2Id,
      planId: starterPlanId,
      status: 'active',
      startDate: new Date('2026-01-01'),
      expiryDate: oneYearFromNow,
      createdAt: now,
      updatedAt: now,
    },
    {
      instituteId: inst3Id,
      planId: enterprisePlanId,
      status: 'active',
      startDate: new Date('2026-01-01'),
      expiryDate: oneYearFromNow,
      createdAt: now,
      updatedAt: now,
    },
    {
      instituteId: inst4Id,
      planId: proPlanId,
      status: 'pending_activation',
      startDate: now,
      expiryDate: oneYearFromNow,
      createdAt: now,
      updatedAt: now,
    },
    {
      instituteId: inst5Id,
      planId: starterPlanId,
      status: 'expired',
      startDate: new Date('2025-01-01'),
      expiryDate: sevenDaysFromNow, // Expiring in 7 days
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log('✅ Inserted Subscriptions for System Admin inspection.');

  // 4. Users (Super Admin + Institute Admins + Staff)
  const superAdminUserId = new mongoose.Types.ObjectId();
  const inst1AdminUserId = new mongoose.Types.ObjectId();
  const inst2AdminUserId = new mongoose.Types.ObjectId();
  const inst3AdminUserId = new mongoose.Types.ObjectId();
  const inst4AdminUserId = new mongoose.Types.ObjectId();
  const teacher1UserId = new mongoose.Types.ObjectId();
  const student1UserId = new mongoose.Types.ObjectId();
  const parent1UserId = new mongoose.Types.ObjectId();

  await db.collection('users').insertMany([
    {
      _id: superAdminUserId,
      role: 'super_admin',
      username: 'superadmin',
      email: 'superadmin@edumanage.com',
      passwordHash: defaultPasswordHash,
      firstName: 'System',
      lastName: 'SuperAdmin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: inst1AdminUserId,
      instituteId: inst1Id,
      role: 'institute_admin',
      username: 'apex_admin',
      email: 'admin@apexcoaching.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Rajesh',
      lastName: 'Sharma',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: inst2AdminUserId,
      instituteId: inst2Id,
      role: 'institute_admin',
      username: 'zenith_admin',
      email: 'admin@zenithscholars.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Ananya',
      lastName: 'Chatterjee',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: inst3AdminUserId,
      instituteId: inst3Id,
      role: 'institute_admin',
      username: 'narayana_admin',
      email: 'admin@narayanascience.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Kalyan',
      lastName: 'Rao',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: inst4AdminUserId,
      instituteId: inst4Id,
      role: 'institute_admin',
      username: 'pinnacle_admin',
      email: 'admin@pinnaclehub.org',
      passwordHash: defaultPasswordHash,
      firstName: 'Amitabh',
      lastName: 'Joshi',
      isActive: false, // Pending activation
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: teacher1UserId,
      instituteId: inst1Id,
      role: 'teacher',
      username: 'teacher_physics',
      email: 'physics.teacher@apex.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Dr. Suresh',
      lastName: 'Verma',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: student1UserId,
      instituteId: inst1Id,
      role: 'student',
      username: 'rahul_kumar',
      email: 'rahul.kumar@gmail.com',
      studentId: 'APX-STU-001',
      passwordHash: defaultPasswordHash,
      firstName: 'Rahul',
      lastName: 'Kumar',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: parent1UserId,
      instituteId: inst1Id,
      role: 'parent',
      username: 'vikram_kumar',
      email: 'vikram.kumar@gmail.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Vikram',
      lastName: 'Kumar',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log('✅ Inserted Users.');

  // 5. Teacher Profile
  const teacher1Id = new mongoose.Types.ObjectId();
  await db.collection('teachers').insertOne({
    _id: teacher1Id,
    instituteId: inst1Id,
    userId: teacher1UserId,
    teacherId: 'TCH-001',
    firstName: 'Dr. Suresh',
    lastName: 'Verma',
    email: 'physics.teacher@apex.edu',
    phone: '+91 98765 99999',
    qualification: 'Ph.D. in Physics',
    specialization: 'Physics & Applied Mathematics',
    joiningDate: new Date('2024-01-15'),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // 6. Student Profile
  const student1Id = new mongoose.Types.ObjectId();
  await db.collection('students').insertOne({
    _id: student1Id,
    instituteId: inst1Id,
    userId: student1UserId,
    studentId: 'APX-STU-001',
    admissionNumber: 'ADM-2026-001',
    firstName: 'Rahul',
    lastName: 'Kumar',
    email: 'rahul.kumar@gmail.com',
    phone: '+91 98123 45678',
    gender: 'male',
    academicYear: '2025-2026',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // 7. Parent Profile
  const parent1Id = new mongoose.Types.ObjectId();
  await db.collection('parents').insertOne({
    _id: parent1Id,
    instituteId: inst1Id,
    userId: parent1UserId,
    firstName: 'Vikram',
    lastName: 'Kumar',
    email: 'vikram.kumar@gmail.com',
    phone: '+91 98123 00000',
    relationship: 'father',
    children: [student1Id],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // 8. Batches & Subjects
  const subject1Id = new mongoose.Types.ObjectId();
  await db.collection('subjects').insertOne({
    _id: subject1Id,
    instituteId: inst1Id,
    name: 'Physics XI',
    code: 'PHY11',
    description: 'Higher Secondary Physics Mechanics & Thermodynamics',
    maxMarks: 100,
    passingMarks: 35,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const batch1Id = new mongoose.Types.ObjectId();
  await db.collection('batches').insertOne({
    _id: batch1Id,
    instituteId: inst1Id,
    name: 'Class 11 Science (A)',
    code: '11-SCI-A',
    academicYear: '2025-2026',
    capacity: 40,
    students: [student1Id],
    teachers: [teacher1Id],
    subjects: [subject1Id],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // 9. Fee Payments
  await db.collection('feepayments').insertOne({
    instituteId: inst1Id,
    studentId: student1Id,
    batchId: batch1Id,
    receiptNumber: 'RCP-20260101-1001',
    amountPaid: 5000,
    paymentDate: new Date('2026-01-05'),
    paymentMode: 'online',
    transactionId: 'TXN_RAZORPAY_987654',
    status: 'completed',
    recordedBy: inst1AdminUserId,
    createdAt: now,
    updatedAt: now,
  });

  // 10. Exams & Marks
  const exam1Id = new mongoose.Types.ObjectId();
  await db.collection('exams').insertOne({
    _id: exam1Id,
    instituteId: inst1Id,
    batchId: batch1Id,
    name: 'Mid-Term Physics Exam',
    code: 'EXAM-PHY-MID',
    academicYear: '2025-2026',
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-02-10'),
    totalMarks: 100,
    passingMarks: 35,
    status: 'completed',
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('marks').insertOne({
    instituteId: inst1Id,
    examId: exam1Id,
    studentId: student1Id,
    subjectId: subject1Id,
    maxMarks: 100,
    obtainedMarks: 88,
    percentage: 88,
    grade: 'A',
    isPass: true,
    remarks: 'Excellent problem solving skills',
    createdAt: now,
    updatedAt: now,
  });

  // 11. System Announcements (Platform-wide)
  await db.collection('announcements').insertMany([
    {
      instituteId: null,
      postedBy: superAdminUserId,
      title: '📌 Scheduled Platform Upgrade Notice',
      message: 'EduManage platform will undergo scheduled database maintenance on 1st August between 02:00 AM and 04:00 AM IST.',
      type: 'warning',
      createdAt: now,
      updatedAt: now,
    },
    {
      instituteId: null,
      postedBy: superAdminUserId,
      title: '🎉 Feature Launch: MongoDB Atlas Multi-Tenant Architecture',
      message: 'We are thrilled to announce complete migration to MongoDB Atlas with improved real-time performance and custom grading rules.',
      type: 'info',
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log('✅ Inserted System Announcements.');

  // 12. Activity Logs for Super Admin Monitoring
  await db.collection('activitylogs').insertMany([
    {
      userId: superAdminUserId,
      action: 'super_admin_login',
      entityType: 'auth',
      entityId: superAdminUserId.toString(),
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      userId: superAdminUserId,
      action: 'subscription_plan_created',
      entityType: 'subscription_plan',
      entityId: enterprisePlanId.toString(),
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 7200000),
    },
    {
      instituteId: inst4Id,
      userId: inst4AdminUserId,
      action: 'institute_self_registered',
      entityType: 'institute',
      entityId: inst4Id.toString(),
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 14400000),
    },
    {
      instituteId: inst1Id,
      userId: inst1AdminUserId,
      action: 'subscription_assigned',
      entityType: 'institute',
      entityId: inst1Id.toString(),
      ipAddress: '127.0.0.1',
      createdAt: new Date(Date.now() - 28800000),
    },
  ]);
  console.log('✅ Inserted System Activity Logs.');

  console.log('🌱 Comprehensive System Admin database seeding completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

seedData().catch((err) => {
  console.error('❌ Failed to seed database:', err);
  process.exit(1);
});
