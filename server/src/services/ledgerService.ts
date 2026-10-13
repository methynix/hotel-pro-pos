import mongoose, { ClientSession } from 'mongoose';
import { Transaction, ITransaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { Account, IAccount } from '../models/Account';
import { Category } from '../models/Category';
import { NotFoundError, ValidationError } from '../utils/errors';

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
}

type Direction = 'in' | 'out';

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

/**
 * Applies (multiplier 1) or reverses (multiplier -1) a transaction's effect
 * on its accounts. Only completed transactions affect balances.
 */
async function applyToBalances(
  tx: Pick<ITransaction, 'organizationId' | 'type' | 'amount' | 'status' | 'accountId' | 'fromAccountId' | 'toAccountId'>,
  multiplier: 1 | -1,
  session: ClientSession
): Promise<void> {
  if (tx.status !== 'completed') return;
  for (const leg of legs(tx)) {
    const account = await Account.findOne({ _id: leg.accountId, organizationId: tx.organizationId }).session(session);
    if (!account) throw new NotFoundError('Account');
    await Account.updateOne(
      { _id: account._id },
      { $inc: { currentBalance: multiplier * signedDelta(account, leg.direction, tx.amount) } },
      { session }
    );
  }
}

/** Checks that every referenced account and category exists in the organization and fits the type. */
async function validateReferences(organizationId: string, input: LedgerInput, session: ClientSession): Promise<void> {
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
    return;
  }

  await findAccount(input.accountId, 'an account');
  if (!input.categoryId || !mongoose.isValidObjectId(input.categoryId)) throw new ValidationError('Choose a category');
  const category = await Category.findOne({ _id: input.categoryId, organizationId }).session(session);
  if (!category) throw new ValidationError('Category was not found');
  if (category.type !== input.type) {
    throw new ValidationError(`${category.name} is an ${category.type} category; pick an ${input.type} category`);
  }
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

/** Runs `work` in a MongoDB transaction, retrying on transient errors. */
const inTransaction = <T>(work: (session: ClientSession) => Promise<T>): Promise<T> =>
  mongoose.connection.transaction(work);

export const ledgerService = {
  inTransaction,

  /** Records a transaction and updates account balances atomically. */
  async create(organizationId: string, createdBy: string, input: LedgerInput, existingSession?: ClientSession) {
    const run = async (session: ClientSession) => {
      await validateReferences(organizationId, input, session);
      const [tx] = await Transaction.create(
        [{ ...normalize(input), organizationId, createdBy, recurringTransactionId: input.recurringTransactionId }],
        { session }
      );
      await applyToBalances(tx, 1, session);
      return tx;
    };
    return existingSession ? run(existingSession) : inTransaction(run);
  },

  /** Reverses the old effect, saves the changes, and applies the new effect, atomically. */
  async update(organizationId: string, id: string, changes: Partial<LedgerInput>) {
    return inTransaction(async (session) => {
      const tx = await Transaction.findOne({ _id: id, organizationId }).session(session);
      if (!tx) throw new NotFoundError('Transaction');

      await applyToBalances(tx, -1, session);

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
      await validateReferences(organizationId, merged, session);

      tx.set(normalize(merged));
      await tx.save({ session });
      await applyToBalances(tx, 1, session);
      return tx;
    });
  },

  /** Deletes a transaction and reverses its effect on balances, atomically. */
  async remove(organizationId: string, id: string) {
    return inTransaction(async (session) => {
      const tx = await Transaction.findOne({ _id: id, organizationId }).session(session);
      if (!tx) throw new NotFoundError('Transaction');
      await applyToBalances(tx, -1, session);
      await Transaction.deleteOne({ _id: tx._id }, { session });
      return tx;
    });
  },

  /** True when any transaction posts to the account. */
  async accountHasTransactions(accountId: mongoose.Types.ObjectId | string): Promise<boolean> {
    return !!(await Transaction.exists({
      $or: [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }],
    }));
  },
};
