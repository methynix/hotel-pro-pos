const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

const seedUsers = [
  {
    email: 'admin@ledgerhq.com',
    password: 'Admin123!@#',
    name: 'Admin User',
    role: 'admin',
  },
  {
    email: 'manager@ledgerhq.com',
    password: 'Manager123!@#',
    name: 'Manager User',
    role: 'manager',
  },
  {
    email: 'viewer@ledgerhq.com',
    password: 'Viewer123!@#',
    name: 'Viewer User',
    role: 'viewer',
  },
];

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      retryWrites: true,
      w: 'majority',
    });
    console.log('✅ Connected to MongoDB');

    // Create User model
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, enum: ['admin', 'manager', 'viewer', 'operator'], required: true },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const User = mongoose.model('User', userSchema);

    // Drop the entire collection to ensure clean state
    try {
      await User.collection.drop();
      console.log('🗑️  Dropped existing users collection');
    } catch (err) {
      console.log('ℹ️  No existing collection to drop');
    }

    console.log('');

    // Create seed users
    for (const userData of seedUsers) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const user = await User.create({
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
      });

      console.log(`✅ Created ${userData.role.toUpperCase()}: ${userData.email}`);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📋 DEMO CREDENTIALS - Store these securely!\n');
    seedUsers.forEach((user) => {
      console.log(`Email:    ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role:     ${user.role}`);
      console.log('───────────────────────────────────────────────────');
    });

    console.log('\n✅ Seed completed successfully!');
    await mongoose.disconnect();
    console.log('✅ Database connection closed\n');
  } catch (error) {
    console.error('❌ Seed error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

seed();
