import { Request, Response, NextFunction } from 'express';
import { Account } from '../models/Account';
import { RecurringTransaction } from '../models/RecurringTransaction';
import { sendSuccess } from '../utils/response';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { orgScope } from '../middleware/auth';
import { ledgerService } from '../services/ledgerService';
import { parse } from '../utils/validate';
import { formatMinor } from '../utils/money';
import { createAccountSchema, updateAccountSchema } from '../validators/account';
import { actorFrom, auditService } from '../services/auditService';

export const accountController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const accounts = await Account.find(orgScope(req)).sort({ name: 1 });
      sendSuccess(res, 200, accounts);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = parse(createAccountSchema, req.body);
      const account = await Account.create({
        ...input,
        currentBalance: input.openingBalance,
        ...orgScope(req),
        createdBy: req.user!.userId,
      });
      sendSuccess(res, 201, account);
      auditService.record(actorFrom(req), {
        action: 'account.created',
        entityType: 'account',
        entityId: account._id,
        summary: `Added account ${account.name} with opening balance ${formatMinor(account.openingBalance, account.currency)}`,
        after: account,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = parse(updateAccountSchema, req.body);

      const updated = await ledgerService.inTransaction(async (session) => {
        const account = await Account.findOne({ _id: req.params.id, ...orgScope(req) }).session(session);
        if (!account) throw new NotFoundError('Account');
        const before = account.toJSON();
        const previousOpening = account.openingBalance;

        // Type and currency decide how past transactions were applied, so
        // they are fixed once the account has any.
        const changesType = changes.type && changes.type !== account.type;
        const changesCurrency = changes.currency && changes.currency !== account.currency;
        if ((changesType || changesCurrency) && (await ledgerService.accountHasTransactions(account._id))) {
          throw new ValidationError("This account has transactions, so its type and currency can't change");
        }

        // Correcting the opening balance shifts the current balance by the same amount.
        if (changes.openingBalance !== undefined) {
          account.currentBalance += changes.openingBalance - account.openingBalance;
        }
        account.set(changes);
        await account.save({ session });
        await auditService.record(
          actorFrom(req),
          {
            action: 'account.updated',
            entityType: 'account',
            entityId: account._id,
            summary:
              changes.openingBalance !== undefined && changes.openingBalance !== previousOpening
                ? `Changed opening balance of ${account.name}, shifting its current balance to ${formatMinor(account.currentBalance, account.currency)}`
                : `Edited account ${account.name}`,
            before,
            after: account,
          },
          session
        );
        return account;
      });

      sendSuccess(res, 200, updated);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const account = await Account.findOne({ _id: req.params.id, ...orgScope(req) });
      if (!account) throw new NotFoundError('Account');

      if (
        (await ledgerService.accountHasTransactions(account._id)) ||
        (await RecurringTransaction.exists({ accountId: account._id }))
      ) {
        throw new ConflictError(
          'This account has transactions or recurring entries. Mark it inactive instead, so its history stays intact.'
        );
      }

      await Account.deleteOne({ _id: account._id });
      sendSuccess(res, 200, { message: 'Account deleted' });
      auditService.record(actorFrom(req), {
        action: 'account.deleted',
        entityType: 'account',
        entityId: account._id,
        summary: `Deleted unused account ${account.name}`,
        before: account,
      });
    } catch (error) {
      next(error);
    }
  },
};
