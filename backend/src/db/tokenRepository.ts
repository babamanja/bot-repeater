import { Prisma } from "@prisma/client";

import { getPrisma } from "./prisma.js";

export type TokenTransactionType =
  | "purchase"
  | "spend"
  | "refund"
  | "bonus"
  | "expire"
  | "admin_adjustment";

function toBigIntAmount(amount: number): bigint {
  if (!Number.isFinite(amount)) {
    throw new RangeError("token amount must be a finite number");
  }
  const normalized = Number.isInteger(amount)
    ? amount
    : amount > 0
      ? Math.ceil(amount)
      : Math.floor(amount);
  return BigInt(normalized);
}

function toJsonObject(
  metadata: Record<string, unknown>,
): Prisma.InputJsonValue {
  return metadata as Prisma.InputJsonValue;
}

export async function selectTokenBalanceByUserId(
  userId: number,
): Promise<bigint> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  });
  return user?.tokenBalance ?? 0n;
}

export async function addTokensForUser(input: {
  userId: number;
  amount: number;
  transactionType: TokenTransactionType;
  referenceId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ balance: bigint }> {
  const amountAsBigInt = toBigIntAmount(input.amount);
  const result = await getPrisma().$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: input.userId },
      data: {
        tokenBalance: { increment: amountAsBigInt },
      },
      select: { tokenBalance: true },
    });

    await tx.tokenLedgerEntry.create({
      data: {
        userId: input.userId,
        delta: amountAsBigInt,
        balanceAfter: updated.tokenBalance,
        transactionType: input.transactionType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata ? toJsonObject(input.metadata) : undefined,
      },
    });

    return { balance: updated.tokenBalance };
  });

  return result;
}

/** Skips balance update if idempotency_key already exists (duplicate webhook safe). */
export async function addTokensForUserIdempotent(input: {
  userId: number;
  amount: number;
  transactionType: TokenTransactionType;
  referenceId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ balance: bigint; applied: boolean }> {
  try {
    const { balance } = await addTokensForUser(input);
    return { balance, applied: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const balance = await selectTokenBalanceByUserId(input.userId);
      return { balance, applied: false };
    }
    throw error;
  }
}

export async function adjustTokensForUser(input: {
  userId: number;
  delta: number;
  comment: string;
  adminUserId: number;
}): Promise<{ balance: bigint }> {
  const deltaAsBigInt = toBigIntAmount(input.delta);

  const result = await getPrisma().$transaction(async (tx) => {
    let updatedBalance: bigint | null = null;

    if (input.delta > 0) {
      const updated = await tx.user.update({
        where: { id: input.userId },
        data: {
          tokenBalance: { increment: deltaAsBigInt },
        },
        select: { tokenBalance: true },
      });
      updatedBalance = updated.tokenBalance;
    } else {
      const requiredAmount = BigInt(Math.abs(input.delta));
      const decrementResult = await tx.user.updateMany({
        where: {
          id: input.userId,
          tokenBalance: { gte: requiredAmount },
        },
        data: {
          tokenBalance: { decrement: requiredAmount },
        },
      });
      if (decrementResult.count === 0) {
        throw new Error("insufficient token balance");
      }
      const updated = await tx.user.findUnique({
        where: { id: input.userId },
        select: { tokenBalance: true },
      });
      if (!updated) {
        throw new Error("user not found");
      }
      updatedBalance = updated.tokenBalance;
    }

    await tx.tokenLedgerEntry.create({
      data: {
        userId: input.userId,
        delta: deltaAsBigInt,
        balanceAfter: updatedBalance,
        transactionType: "admin_adjustment",
        referenceId: `admin:${input.adminUserId}`,
        metadata: toJsonObject({
          comment: input.comment,
          adjustedByAdminUserId: input.adminUserId,
        }),
      },
    });

    return { balance: updatedBalance };
  });

  return result;
}

export async function spendTokensAllowNegative(input: {
  userId: number;
  amount: number;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ balance: bigint }> {
  const amountAsBigInt = toBigIntAmount(input.amount);
  if (amountAsBigInt <= 0n) {
    const balance = await selectTokenBalanceByUserId(input.userId);
    return { balance };
  }

  const result = await getPrisma().$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: input.userId },
      data: {
        tokenBalance: { decrement: amountAsBigInt },
      },
      select: { tokenBalance: true },
    });

    await tx.tokenLedgerEntry.create({
      data: {
        userId: input.userId,
        delta: -amountAsBigInt,
        balanceAfter: updated.tokenBalance,
        transactionType: "spend",
        referenceId: input.referenceId,
        metadata: input.metadata ? toJsonObject(input.metadata) : undefined,
      },
    });

    return { balance: updated.tokenBalance };
  });

  return result;
}

export async function spendTokensForUser(input: {
  userId: number;
  amount: number;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ balance: bigint }> {
  const amountAsBigInt = toBigIntAmount(input.amount);
  const result = await getPrisma().$transaction(async (tx) => {
    const decremented = await tx.user.updateMany({
      where: {
        id: input.userId,
        tokenBalance: { gte: amountAsBigInt },
      },
      data: {
        tokenBalance: { decrement: amountAsBigInt },
      },
    });
    if (decremented.count === 0) {
      throw new Error("insufficient token balance");
    }

    const updated = await tx.user.findUnique({
      where: { id: input.userId },
      select: { tokenBalance: true },
    });
    if (!updated) {
      throw new Error("user not found");
    }

    await tx.tokenLedgerEntry.create({
      data: {
        userId: input.userId,
        delta: -amountAsBigInt,
        balanceAfter: updated.tokenBalance,
        transactionType: "spend",
        referenceId: input.referenceId,
        metadata: input.metadata ? toJsonObject(input.metadata) : undefined,
      },
    });

    return { balance: updated.tokenBalance };
  });

  return result;
}
