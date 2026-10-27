import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IdempotencyKey } from '../models/IdempotencyKey';
import { AppError, ValidationError } from '../utils/errors';

const HEADER = 'idempotency-key';
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

const hashRequest = (req: Request) =>
  crypto
    .createHash('sha256')
    .update(`${req.method} ${req.originalUrl}\n${JSON.stringify(req.body ?? {})}`)
    .digest('hex');

/**
 * Makes a money-moving endpoint safe to retry. The client sends a unique
 * Idempotency-Key per intended action (the web app makes one per form
 * submission and reuses it on retries). The first request runs normally and
 * its successful response is stored for 24 hours; a repeat with the same key
 * gets that stored response back instead of running again. Requests without
 * the header run normally.
 *
 * Must come after `authenticate`, since keys are scoped per user.
 */
export const idempotent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = req.get(HEADER);
  if (!key) return next();
  if (!KEY_PATTERN.test(key)) return next(new ValidationError('Invalid Idempotency-Key header'));

  const userId = req.user!.userId;
  const requestHash = hashRequest(req);

  try {
    await IdempotencyKey.create({ key, userId, method: req.method, path: req.originalUrl, requestHash });
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) return next(error);

    // Seen this key before.
    const existing = await IdempotencyKey.findOne({ userId, key });
    if (!existing) return next(new AppError(409, 'Please retry the request', 'IDEMPOTENCY_RETRY'));
    if (existing.requestHash !== requestHash) {
      return next(new AppError(422, 'This Idempotency-Key was already used for a different request', 'IDEMPOTENCY_MISMATCH'));
    }
    if (existing.state === 'processing') {
      const ageMs = Date.now() - new Date(existing.createdAt).getTime();
      if (ageMs < 120_000) {
        return next(new AppError(409, 'This request is already being processed', 'IDEMPOTENCY_IN_PROGRESS'));
      }
      // The previous request crashed or timed out over 2 minutes ago. Release the key for retry.
      await IdempotencyKey.deleteOne({ _id: existing._id });
      try {
        await IdempotencyKey.create({ key, userId, method: req.method, path: req.originalUrl, requestHash });
      } catch (recreateErr) {
        return next(new AppError(409, 'Please retry the request', 'IDEMPOTENCY_RETRY'));
      }
    } else {
      res.set('Idempotent-Replayed', 'true');
      res.status(existing.responseStatus ?? 200).json(existing.responseBody);
      return;
    }
  }

  // Capture the response so a retry can replay it.
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const status = res.statusCode;
    const settle =
      status >= 200 && status < 300
        ? IdempotencyKey.updateOne({ userId, key }, { state: 'done', responseStatus: status, responseBody: body })
        : // Failed requests release the key, so the user can correct the input and try again.
          IdempotencyKey.deleteOne({ userId, key });
    // Record the outcome before replying, so a retry that arrives right after
    // the response sees "done" rather than "processing".
    settle
      .catch((e) => console.error('Idempotency bookkeeping failed:', e instanceof Error ? e.message : e))
      .finally(() => originalJson(body));
    return res;
  };

  next();
};
