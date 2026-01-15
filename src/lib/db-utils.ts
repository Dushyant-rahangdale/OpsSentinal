import { Prisma } from '@prisma/client';
import prisma from './prisma';

export const TRANSACTION_MAX_ATTEMPTS = 3;

function isRetryableTransactionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034' || error.code === 'P2002';
  }
  const message = error instanceof Error ? error.message : '';
  return message.includes('Serialization') || message.includes('deadlock');
}

/**
 * Run a transaction with automatic retries for serialization failures and deadlocks.
 * Uses 'Serializable' isolation level by default.
 */
export async function runSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts: number = TRANSACTION_MAX_ATTEMPTS
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return (await prisma.$transaction(operation as any, { isolationLevel: 'Serializable' })) as T; // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (error) {
      if (attempt < maxAttempts - 1 && isRetryableTransactionError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Transaction failed after ${maxAttempts} retries.`);
}
