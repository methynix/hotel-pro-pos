import mongoose, { ClientSession } from 'mongoose';
import { Transaction, ITransaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { Account, IAccount } from '../models/Account';
import { Category } from '../models/Category';
import { Expense } from '../models/Expense';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { formatMinor, fromMinor } from '../utils/money';
import { Actor, auditService } from './auditService';

/** Fields that decide a transaction's effect on balances, in minor units. */
export interface LedgerInput {
  type: TransactionType;
  amount: number;
  description: string;
  accountId?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  transactionDate: Date;
  status: TransactionStatus;
  paymentMethod?: string;
  reference?: string;
  recurringTransactionId?: string;
  expenseId?: string;
}

type Direction = 'in' | 'out';

/** One account's balance before and after a ledger operation, in major units, for the audit log. */
interface BalanceChange {
  accountId: string;
  account: string;
  before: number;
  after: number;
}

// Money flowing into a checking/savings account raises its balance. A
// credit account's balance is the amount owed, so money flowing in (a
// repayment) lowers it and spending on it raises it.
const signedDelta = (account: IAccount, direction: Direction, amount: number) => {
  const sign = direction === 'in' ? 1 : -1;
  return account.type === 'credit' ? -sign * amount : sign * amount;
};

const legs = (tx: Pick<ITransaction, 'type' | 'accountId' | 'fromAccountId' | 'toAccountId'>) =>
  tx.type === 'transfer'
    ? [
        { accountId: tx.fromAccountId!, direction: 'out' as Direction },
        { accountId: tx.toAccountId!, direction: 'in' as Direction },
      ]
    : [{ accountId: tx.accountId!, direction: (tx.type === 'income' ? 'in' : 'out') as Direction }];

/** Whether a transaction currently counts toward balances. */
export const affectsBalances = (tx: Pick<ITransaction, 'status' | 'isVoided'>) =>
  tx.status === 'completed' && !tx.isVoided;

/**
 * Applies (multiplier 1) or reverses (multiplier -1) a transaction's effect
 * on its accounts, returning each account's balance before and after.
 */
async function applyToBalances(
  tx: ITransaction,
  multiplier: 1 | -1,
  session: ClientSession
): Promise<BalanceChange[]> {
  if (!affectsBalances(tx)) return [];
  const changes: BalanceChange[] = [];
  for (const leg of legs(tx)) {
    const account = await Account.findOne({ _id: leg.accountId, organizationId: tx.organizationId }).session(session);
    if (!account) throw new NotFoundError('Account');
    const delta = multiplier * signedDelta(account, leg.direction, tx.amount);
    await Account.updateOne({ _id: account._id }, { $inc: { currentBalance: delta } }, { session });
    changes.push({
      accountId: account._id.toString(),
      account: account.name,
      before: fromMinor(account.currentBalance),
      after: fromMinor(account.currentBalance + delta),
    });
  }
  return changes;
}

/** Checks that every referenced account and category exists in the organization and fits the type. */
async function validateReferences(organizationId: string, input: LedgerInput, session: ClientSession): Promise<IAccount> {
  const findAccount = async (id: string | undefined, label: string) => {
    if (!id || !mongoose.isValidObjectId(id)) throw new ValidationError(`Choose ${label}`);
    const account = await Account.findOne({ _id: id, organizationId }).session(session);
    if (!account) throw new ValidationError(`${label[0].toUpperCase()}${label.slice(1)} was not found`);
    if (account.status !== 'active') throw new ValidationError(`${account.name} is inactive; reactivate it first`);
    return account;
  };

  if (input.type === 'transfer') {
    const from = await findAccount(input.fromAccountId, 'the account to transfer from');
    const to = await findAccount(input.toAccountId, 'the account to transfer to');
    if (from._id.equals(to._id)) throw new ValidationError('Choose two different accounts for a transfer');
    if (from.currency !== to.currency) {
      throw new ValidationError(`Can't transfer between ${from.currency} and ${to.currency} accounts`);
    }
    return from;
  }

  const account = await findAccount(input.accountId, 'an account');
  if (!input.categoryId || !mongoose.isValidObjectId(input.categoryId)) throw new ValidationError('Choose a category');
  const category = await Category.findOne({ _id: input.categoryId, organizationId }).session(session);
  if (!category) throw new ValidationError('Category was not found');
  if (category.type !== input.type) {
    throw new ValidationError(`${category.name} is an ${category.type} category; pick an ${input.type} category`);
  }
  return account;
}

/** Keeps only the fields that make sense for the transaction's type. */
function normalize(input: LedgerInput) {
  const base = {
    type: input.type,
    amount: input.amount,
    description: input.description,
    transactionDate: input.transactionDate,
    status: input.status,
    paymentMethod: input.paymentMethod,
    reference: input.reference,
  };
  return input.type === 'transfer'
    ? { ...base, fromAccountId: input.fromAccountId, toAccountId: input.toAccountId, accountId: undefined, categoryId: undefined }
    : { ...base, accountId: input.accountId, categoryId: input.categoryId, fromAccountId: undefined, toAccountId: undefined };
}

const describe = (tx: Pick<ITransaction, 'type' | 'description' | 'amount'>, currency: string) =>
  `${tx.type} "${tx.description}" of ${formatMinor(tx.amount, currency)}`;

/** Runs `work` in a MongoDB transaction, retrying on transient errors. */
const inTransaction = <T>(work: (session: ClientSession) => Promise<T>): Promise<T> =>
  mongoose.connection.transaction(work);

export const ledgerService = {
  inTransaction,

  /**
   * Records a transaction, updates account balances and writes the audit
   * entry atomically. `createdBy` defaults to the actor; scheduled jobs pass
   * the user who set up the schedule.
   */
  async create(actor: Actor, input: LedgerInput, options: { session?: ClientSession; createdBy?: string } = {}) {
    const run = async (session: ClientSession) => {
      const account = await validateReferences(actor.organizationId, input, session);
      const [tx] = await Transaction.create(
        [
          {
            ...normalize(input),
            organizationId: actor.organizationId,
            createdBy: options.createdBy ?? actor.userId,
            recurringTransactionId: input.recurringTransactionId,
            expenseId: input.expenseId,
          },
        ],
        { session }
      );
      const balances = await applyToBalances(tx, 1, session);
      await auditService.record(
        actor,
        {
          action: 'transaction.created',
          entityType: 'transaction',
          entityId: tx._id,
          summary: `Recorded ${describe(tx, account.currency)}`,
          after: { transaction: tx.toJSON(), balances },
        },
        session
      );
      return tx;
    };
    return options.session ? run(options.session) : inTransaction(run);
  },

  /** Reverses the old effect, saves the changes, and applies the new effect, atomically. */
  async update(actor: Actor, id: string, changes: Partial<LedgerInput>) {
    return inTransaction(async (session) => {
      const tx = await Transaction.findOne({ _id: id, organizationId: actor.organizationId }).session(session);
      if (!tx) throw new NotFoundError('Transaction');
      if (tx.isVoided) throw new ConflictError('This transaction is voided and can no longer be edited');
      if (tx.expenseId) {
        throw new ConflictError(
          'This transaction pays an expense. Void it instead; the expense goes back to approved so it can be paid again correctly.'
        );
      }

      const before = tx.toJSON();
      const reversed = await applyToBalances(tx, -1, session);

      const merged: LedgerInput = {
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        accountId: tx.accountId?.toString(),
        categoryId: tx.categoryId?.toString(),
        fromAccountId: tx.fromAccountId?.toString(),
        toAccountId: tx.toAccountId?.toString(),
        transactionDate: tx.transactionDate,
        status: tx.status,
        paymentMethod: tx.paymentMethod,
        reference: tx.reference,
        ...changes,
      };
      const account = await validateReferences(actor.organizationId, merged, session);

      tx.set(normalize(merged));
      await tx.save({ session });
      const applied = await applyToBalances(tx, 1, session);

      await auditService.record(
        actor,
        {
          action: 'transaction.updated',
          entityType: 'transaction',
          entityId: tx._id,
          summary: `Edited ${describe(tx, account.currency)}`,
          before: { transaction: before, balances: reversed },
          after: { transaction: tx.toJSON(), balances: applied },
        },
        session
      );
      return tx;
    });
  },

  /**
   * Voids a transaction: keeps the record, reverses its effect on balances,
   * and excludes it from every total. If it paid an expense, that expense
   * goes back to approved. Voiding twice is rejected, so a double-click
   * can't reverse the money twice.
   */
  async void(actor: Actor, id: string, reason: string) {
    return inTransaction(async (session) => {
      // The isVoided:false condition makes the flip atomic: of two concurrent
      // requests, only one finds the transaction still un-voided.
      const tx = await Transaction.findOneAndUpdate(
        { _id: id, organizationId: actor.organizationId, isVoided: { $ne: true } },
        { isVoided: true, voidedAt: new Date(), voidedBy: actor.userId, voidReason: reason },
        { new: false, session }
      );
      if (!tx) {
        const exists = await Transaction.exists({ _id: id, organizationId: actor.organizationId }).session(session);
        throw exists ? new ConflictError('This transaction is already voided') : new NotFoundError('Transaction');
      }

      // `tx` is the pre-update document, so reversing uses its original effect.
      const balances = await applyToBalances(tx, -1, session);
      const voided = await Transaction.findById(tx._id).session(session);
      const account = await Account.findById(tx.accountId ?? tx.fromAccountId).session(session).select('currency');

      if (tx.expenseId) {
        await Expense.updateOne(
          { _id: tx.expenseId, status: 'paid' },
          { status: 'approved', $unset: { transactionId: 1, accountId: 1, paidBy: 1, paidAt: 1 } },
          { session }
        );
      }

      await auditService.record(
        actor,
        {
          action: 'transaction.voided',
          entityType: 'transaction',
          entityId: tx._id,
          summary: `Voided ${describe(tx, account?.currency ?? 'TZS')}: ${reason}${tx.expenseId ? ' (expense returned to approved)' : ''}`,
          before: { transaction: tx.toJSON() },
          after: { transaction: voided?.toJSON(), balances },
        },
        session
      );
      return voided!;
    });
  },

  /** True when any transaction, voided or not, posts to the account. */
  async accountHasTransactions(accountId: mongoose.Types.ObjectId | string): Promise<boolean> {
    return !!(await Transaction.exists({
      $or: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }],
    }));
  },
};
