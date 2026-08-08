import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

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
    await mongoose.connect(MONGO_URI as string);
    console.log('✅ Connected to MongoDB');

    // Create User model directly (since we haven't set it up yet)
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, enum: ['admin', 'manager', 'viewer', 'operator'], required: true },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
    });

    const User = mongoose.model('User', userSchema);

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create seed users
    for (const userData of seedUsers) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const user = await User.create({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
      });

      console.log(`✅ Created user: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
    }

    console.log('\n📋 Seed users created successfully!\n');
    console.log('Demo Credentials:');
    console.log('─────────────────────────────────────');
    seedUsers.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.role}`);
      console.log('─────────────────────────────────────');
    });

    await mongoose.disconnect();
    console.log('\n✅ Seed completed!');
  } catch (error) {
    console.error('❌ Seed error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

seed();
