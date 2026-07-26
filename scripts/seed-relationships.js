const mongoose = require('mongoose');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://wwwanas643_db_user:anasmohd111@cluster0.aoa1asx.mongodb.net/tuition_center?retryWrites=true&w=majority&tlsAllowInvalidCertificates=true';

async function seedRelationships() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, { dbName: 'tuition_center' });
    console.log('Connected to database!\n');

    const db = mongoose.connection.db;
    const institutes = await db.collection('institutes').find({ deletedAt: null }).toArray();
    console.log(`Found ${institutes.length} active institutes.`);

    for (const inst of institutes) {
      console.log(`\n==============================================`);
      console.log(`Processing Institute: ${inst.name} (${inst.code})`);
      console.log(`==============================================`);

      const instId = inst._id;

      // 1. Fetch Students, Parents, Teachers, Batches, Subjects
      const students = await db.collection('students').find({ instituteId: instId, deletedAt: null }).toArray();
      const parents = await db.collection('parents').find({ instituteId: instId, deletedAt: null }).toArray();
      const teachers = await db.collection('teachers').find({ instituteId: instId, deletedAt: null }).toArray();
      const batches = await db.collection('batches').find({ instituteId: instId, deletedAt: null }).toArray();
      const subjects = await db.collection('subjects').find({ instituteId: instId, deletedAt: null }).toArray();

      console.log(`Found: ${students.length} Students | ${parents.length} Parents | ${teachers.length} Teachers | ${batches.length} Batches | ${subjects.length} Subjects`);

      if (students.length === 0) {
        console.log('No students found for this institute. Skipping relationship linking.');
        continue;
      }

      // ----------------------------------------------------
      // A. LINK STUDENTS TO PARENTS
      // ----------------------------------------------------
      if (parents.length > 0) {
        console.log('\n--- Linking Children to Parents ---');
        const studentChunkSize = Math.max(1, Math.floor(students.length / parents.length));
        let studentIndex = 0;

        for (let i = 0; i < parents.length; i++) {
          const parent = parents[i];
          const countToAssign = Math.min(2, students.length - studentIndex);
          const assignedStudentObjs = students.slice(studentIndex, studentIndex + (countToAssign > 0 ? countToAssign : 1));
          const childIds = assignedStudentObjs.map((s) => s._id);

          const parentFullName = `${parent.firstName || 'Parent'} ${parent.lastName || ''}`.trim();

          // Update Parent document
          await db.collection('parents').updateOne(
            { _id: parent._id },
            { $set: { children: childIds } }
          );

          // Update Student documents with fatherName and emergency contact
          for (const st of assignedStudentObjs) {
            await db.collection('students').updateOne(
              { _id: st._id },
              {
                $set: {
                  fatherName: parentFullName,
                  emergencyContactName: parentFullName,
                  emergencyContactPhone: parent.phone || '9876543210',
                },
              }
            );
          }

          console.log(`Linked Parent "${parentFullName}" (${parent.phone || 'No phone'}) -> ${assignedStudentObjs.length} Children`);
          studentIndex += assignedStudentObjs.length;
          if (studentIndex >= students.length) studentIndex = 0; // Wrap around if needed
        }
      }

      // ----------------------------------------------------
      // B. LINK TEACHERS TO BATCHES, SUBJECTS & STUDENTS
      // ----------------------------------------------------
      if (batches.length > 0) {
        console.log('\n--- Linking Teachers to Batches & Students ---');
        const teacherIds = teachers.map((t) => t._id);
        const subjectIds = subjects.map((s) => s._id);
        const allStudentIds = students.map((s) => s._id);

        // Distribute students evenly into batches
        const midPoint = Math.ceil(allStudentIds.length / batches.length);
        
        for (let bIdx = 0; bIdx < batches.length; bIdx++) {
          const batch = batches[bIdx];
          const batchStudents = allStudentIds.slice(bIdx * midPoint, (bIdx + 1) * midPoint);
          const assignedTeachers = teacherIds.length > 0 ? [teacherIds[bIdx % teacherIds.length]] : [];

          await db.collection('batches').updateOne(
            { _id: batch._id },
            {
              $set: {
                students: batchStudents.length > 0 ? batchStudents : allStudentIds,
                teachers: assignedTeachers.length > 0 ? assignedTeachers : teacherIds,
                subjects: subjectIds,
              },
            }
          );

          console.log(`Updated Batch "${batch.name}" (${batch.code}) -> ${batchStudents.length || allStudentIds.length} Students | ${assignedTeachers.length || teacherIds.length} Teachers`);
        }

        // Update Teacher records with batch and subject references
        for (let tIdx = 0; tIdx < teachers.length; tIdx++) {
          const teacher = teachers[tIdx];
          const assignedBatchIds = batches.map((b) => b._id);
          const assignedSubjectIds = subjectIds.slice(tIdx, tIdx + 2);

          await db.collection('teachers').updateOne(
            { _id: teacher._id },
            {
              $set: {
                batches: assignedBatchIds,
                subjects: assignedSubjectIds.length > 0 ? assignedSubjectIds : subjectIds,
              },
            }
          );

          console.log(`Updated Teacher "${teacher.firstName} ${teacher.lastName || ''}" -> Assigned ${assignedBatchIds.length} Batches | ${assignedSubjectIds.length || subjectIds.length} Subjects`);
        }
      }
    }

    console.log('\n==============================================');
    console.log('SUCCESS: All Parents & Teachers seeded and linked!');
    console.log('==============================================');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedRelationships();
