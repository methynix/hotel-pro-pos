/* eslint-disable no-console */
// One-off migration from per-user data to organizations and the synchronized
// ledger. Moves every existing user and record into ONE organization (the
// app was effectively single-company before), converts amounts to integer
// minor units, links transactions to accounts and categories by id, and
// recomputes account balances from the ledger.
//
//   node scripts/migrate-organizations-ledger.js                 # report only
//   node scripts/migrate-organizations-ledger.js --apply --org-name "Methynix Software"
//
// Safe to re-run: it records itself in the `migrations` collection and
// refuses to run twice. Back up the database before using --apply.
require('dotenv').config();
const mongoose = require('mongoose');

const MIGRATION_ID = 'organizations-ledger-v1';
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const orgNameArg = args.indexOf('--org-name');
const ORG_NAME = orgNameArg >= 0 ? args[orgNameArg + 1] : 'My Organization';

const DEFAULT_CATEGORIES = [
  ['Sales', 'income'], ['Services', 'income'], ['Other Income', 'income'],
  ['Rent', 'expense'], ['Salaries', 'expense'], ['Utilities', 'expense'],
  ['Supplies', 'expense'], ['Transport', 'expense'], ['Other Expenses', 'expense'],
];

const toMinor = (major) => Math.round(Number(major || 0) * 100);
const mapType = (t) => (t === 'inflow' ? 'income' : t === 'outflow' ? 'expense' : t);

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const col = (name) => db.collection(name);

  if (await col('migrations').findOne({ _id: MIGRATION_ID })) {
    console.log(`Migration ${MIGRATION_ID} has already been applied. Nothing to do.`);
    return;
  }

  const counts = {};
  for (const name of ['users', 'accounts', 'categories', 'transactions', 'expenses', 'budgets', 'recurringtransactions', 'receipts', 'reports']) {
    counts[name] = await col(name).countDocuments();
  }
  const users = await col('users').find().sort({ createdAt: 1 }).toArray();
  const founder = users.find((u) => u.role === 'admin') || users[0];

  console.log(`Database: ${db.databaseName}`);
  console.log('Current documents:', counts);
  console.log(`\nPlan:`);
  console.log(`  - Create organization "${ORG_NAME}" founded by ${founder ? founder.email : '(no users)'}`);
  console.log(`  - Add all ${users.length} users to it, keeping their current roles:`);
  users.forEach((u) => console.log(`      ${u.role || 'viewer'}  ${u.email}`));
  console.log('  - Move every record into the organization and convert amounts to minor units');
  console.log('  - Link transactions/expenses/recurring entries to category and account ids');
  console.log('  - Recompute every account balance from its opening balance plus completed transactions');

  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to make these changes.');
    return;
  }
  if (!founder) {
    console.log('\nNo users found; nothing to migrate.');
    return;
  }

  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    const o = { session };
    const now = new Date();

    const { insertedId: orgId } = await col('organizations').insertOne(
      { name: ORG_NAME, baseCurrency: 'TZS', createdBy: founder._id, createdAt: now, updatedAt: now },
      o
    );

    for (const u of users) {
      await col('users').updateOne(
        { _id: u._id },
        {
          $set: {
            organizations: [{ organizationId: orgId, role: u.role || 'viewer', joinedAt: u.createdAt || now }],
            activeOrganizationId: orgId,
          },
          $unset: { role: '' },
        },
        o
      );
    }

    // Every record gets the organization; whoever owned it becomes its creator.
    const stamp = (name) =>
      col(name).updateMany(
        { organizationId: { $exists: false } },
        [{ $set: { organizationId: orgId, createdBy: { $ifNull: ['$userId', founder._id] } } }],
        o
      );
    for (const name of ['categories', 'accounts', 'transactions', 'expenses', 'budgets', 'recurringtransactions', 'receipts', 'reports']) {
      await stamp(name);
    }

    // Categories: make sure the defaults exist, then resolve old string
    // categories (a name or an id) to category ids, creating any missing.
    const categories = await col('categories').find({ organizationId: orgId }, o).toArray();
    for (const [name, type] of DEFAULT_CATEGORIES) {
      if (!categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type)) {
        const doc = { name, type, organizationId: orgId, createdBy: founder._id, createdAt: now, updatedAt: now };
        doc._id = (await col('categories').insertOne(doc, o)).insertedId;
        categories.push(doc);
      }
    }
    const resolveCategory = async (value, type) => {
      const raw = String(value || '').trim();
      const byId = categories.find((c) => c._id.toString() === raw);
      if (byId) return byId._id;
      const name = raw || (type === 'income' ? 'Other Income' : 'Other Expenses');
      const byName = categories.find((c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type);
      if (byName) return byName._id;
      const doc = { name, type, organizationId: orgId, createdBy: founder._id, createdAt: now, updatedAt: now };
      doc._id = (await col('categories').insertOne(doc, o)).insertedId;
      categories.push(doc);
      return doc._id;
    };

    // Accounts: the old free-typed balance becomes the opening balance.
    const accounts = await col('accounts').find({ organizationId: orgId }, o).toArray();
    for (const a of accounts) {
      const opening = a.openingBalance !== undefined ? a.openingBalance : toMinor(a.balance);
      await col('accounts').updateOne({ _id: a._id }, { $set: { openingBalance: opening, currentBalance: opening }, $unset: { balance: '' } }, o);
      a.openingBalance = opening;
    }

    // Transactions and recurring entries now need an account. Use the first
    // checking/savings account, creating a "Main Account" if there is none.
    let defaultAccountId = null;
    const needsAccount =
      (await col('transactions').countDocuments({ organizationId: orgId, accountId: { $exists: false }, fromAccountId: { $exists: false } }, o)) +
      (await col('recurringtransactions').countDocuments({ organizationId: orgId, accountId: { $exists: false } }, o));
    if (needsAccount > 0) {
      const existing = accounts.find((a) => a.type !== 'credit' && a.status !== 'inactive');
      if (existing) {
        defaultAccountId = existing._id;
      } else {
        const doc = {
          name: 'Main Account', accountNumber: 'MAIN-001', openingBalance: 0, currentBalance: 0,
          currency: 'TZS', type: 'checking', status: 'active',
          organizationId: orgId, createdBy: founder._id, createdAt: now, updatedAt: now,
        };
        doc._id = (await col('accounts').insertOne(doc, o)).insertedId;
        accounts.push(doc);
        defaultAccountId = doc._id;
      }
    }

    for (const t of await col('transactions').find({ organizationId: orgId }, o).toArray()) {
      const type = mapType(t.type);
      const set = { type, amount: toMinor(t.amount), transactionDate: t.transactionDate || t.createdAt || now };
      if (type !== 'transfer') {
        set.accountId = t.accountId || defaultAccountId;
        set.categoryId = t.categoryId || (await resolveCategory(t.category, type));
      }
      await col('transactions').updateOne({ _id: t._id }, { $set: set, $unset: { category: '' } }, o);
    }

    for (const e of await col('expenses').find({ organizationId: orgId }, o).toArray()) {
      await col('expenses').updateOne(
        { _id: e._id },
        { $set: { amount: toMinor(e.amount), categoryId: e.categoryId || (await resolveCategory(e.category, 'expense')) }, $unset: { category: '' } },
        o
      );
    }

    for (const r of await col('recurringtransactions').find({ organizationId: orgId }, o).toArray()) {
      const type = mapType(r.type);
      await col('recurringtransactions').updateOne(
        { _id: r._id },
        {
          $set: {
            type, amount: toMinor(r.amount), accountId: r.accountId || defaultAccountId,
            categoryId: r.categoryId || (await resolveCategory(r.category, type)),
          },
          $unset: { category: '' },
        },
        o
      );
    }

    for (const b of await col('budgets').find({ organizationId: orgId }, o).toArray()) {
      await col('budgets').updateOne({ _id: b._id }, { $set: { amount: toMinor(b.amount), currentSpending: toMinor(b.currentSpending) } }, o);
    }

    for (const r of await col('receipts').find({ organizationId: orgId }, o).toArray()) {
      const items = (r.items || []).map((i) => ({ ...i, unitPrice: toMinor(i.unitPrice), total: toMinor(i.total) }));
      await col('receipts').updateOne({ _id: r._id }, { $set: { amount: toMinor(r.amount), items } }, o);
    }

    // Balances: opening balance plus every completed transaction.
    const all = await col('accounts').find({ organizationId: orgId }, o).toArray();
    const byId = new Map(all.map((a) => [a._id.toString(), { ...a, balance: a.openingBalance || 0 }]));
    const post = (accountId, direction, amount) => {
      const acc = accountId && byId.get(accountId.toString());
      if (!acc) return;
      const sign = direction === 'in' ? 1 : -1;
      acc.balance += acc.type === 'credit' ? -sign * amount : sign * amount;
    };
    for (const t of await col('transactions').find({ organizationId: orgId, status: 'completed' }, o).toArray()) {
      if (t.type === 'transfer') {
        post(t.fromAccountId, 'out', t.amount);
        post(t.toAccountId, 'in', t.amount);
      } else {
        post(t.accountId, t.type === 'income' ? 'in' : 'out', t.amount);
      }
    }
    for (const acc of byId.values()) {
      await col('accounts').updateOne({ _id: acc._id }, { $set: { currentBalance: acc.balance } }, o);
    }

    await col('migrations').insertOne({ _id: MIGRATION_ID, appliedAt: new Date(), organizationId: orgId }, o);
    console.log(`\nApplied. Organization id: ${orgId}`);
  });
  await session.endSession();

  // Account numbers are now unique per organization, not globally. Index
  // changes can't run inside a transaction, so this happens after commit.
  if (await col('accounts').indexExists('accountNumber_1')) {
    await col('accounts').dropIndex('accountNumber_1');
    console.log('Dropped the old global accountNumber index.');
  }
}

main()
  .catch((error) => {
    console.error('Migration failed; nothing was changed:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
