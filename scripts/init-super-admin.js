const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

async function initSuperAdmin() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000, family: 4 });

  const db = mongoose.connection.db;

  const existingSuper = await db.collection('users').findOne({ role: 'super_admin' });
  if (existingSuper) {
    console.log(`ℹ️ Super Admin already exists in MongoDB (username: ${existingSuper.username}). No action needed.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edumanage.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

  const passwordHash = bcrypt.hashSync(password, 10);

  await db.collection('users').insertOne({
    role: 'super_admin',
    username,
    email,
    passwordHash,
    firstName: 'System',
    lastName: 'SuperAdmin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✅ Created Super Admin account:');
  console.log(`   Username: ${username}`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);

  await mongoose.disconnect();
  process.exit(0);
}

initSuperAdmin().catch((err) => {
  console.error('❌ Failed to initialize Super Admin:', err);
  process.exit(1);
});
