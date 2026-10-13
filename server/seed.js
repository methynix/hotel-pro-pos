const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

// Passwords come from SEED_<ROLE>_PASSWORD env vars, or are generated, and
// are printed once at the end. Never hardcode them here: this file is in git.
const passwordFor = (role) =>
  process.env[`SEED_${role.toUpperCase()}_PASSWORD`] || `${crypto.randomBytes(9).toString('base64url')}!7a`;

const seedUsers = [
  { email: 'admin@ledgerhq.com', name: 'Admin User', role: 'admin' },
  { email: 'manager@ledgerhq.com', name: 'Manager User', role: 'manager' },
  { email: 'operator@ledgerhq.com', name: 'Operator User', role: 'operator' },
  { email: 'viewer@ledgerhq.com', name: 'Viewer User', role: 'viewer' },
].map((u) => ({ ...u, password: passwordFor(u.role) }));

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      retryWrites: true,
      w: 'majority',
    });
    console.log('✅ Connected to MongoDB');

    // Raw collections, so the seed doesn't depend on the compiled app.
    const users = mongoose.connection.collection('users');
    const organizations = mongoose.connection.collection('organizations');
    const categories = mongoose.connection.collection('categories');

    // Drop the users collection to ensure a clean state
    try {
      await users.drop();
      console.log('🗑️  Dropped existing users collection');
    } catch (err) {
      console.log('ℹ️  No existing collection to drop');
    }

    console.log('');

    // All seed users share one demo organization, each with their own role.
    const now = new Date();
    const { insertedId: organizationId } = await organizations.insertOne({
      name: 'Demo Business',
      baseCurrency: 'TZS',
      createdAt: now,
      updatedAt: now,
    });

    for (const userData of seedUsers) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const { insertedId } = await users.insertOne({
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name,
        organizations: [{ organizationId, role: userData.role, joinedAt: now }],
        activeOrganizationId: organizationId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      if (userData.role === 'admin') {
        await organizations.updateOne({ _id: organizationId }, { $set: { createdBy: insertedId } });
        await categories.insertMany(
          [
            ['Sales', 'income'], ['Services', 'income'], ['Other Income', 'income'],
            ['Rent', 'expense'], ['Salaries', 'expense'], ['Utilities', 'expense'],
            ['Supplies', 'expense'], ['Transport', 'expense'], ['Other Expenses', 'expense'],
          ].map(([name, type]) => ({ name, type, organizationId, createdBy: insertedId, createdAt: now, updatedAt: now }))
        );
      }

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
