import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";

export type PaymentRow = {
  id: string;
  date: string;
  userId: number;
  userName: string;
  email: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  provider: string | null;
  providerTransactionId: string | null;
  description: string | null;
  metadata: unknown;
  originalPaymentId: string | null;
  refundReason: string | null;
  transactionType: "payment" | "refund";
  createdAt: string;
  updatedAt: string;
};

export type PaymentStatus = PaymentRow["status"];
export type PaymentSortBy = "date" | "amount" | "status" | "transactionType";

export type PaymentsListQuery = {
  page: number;
  pageSize: number;
  sortBy: PaymentSortBy;
  sortOrder: "asc" | "desc";
  status?: PaymentStatus;
  transactionType?: "payment" | "refund";
  search?: string;
};

export type UserPaymentRow = {
  id: string;
  userId: number;
  amount: number;
  currency: string;
  transactionType: "payment" | "refund";
  status: PaymentStatus;
  provider: string | null;
  providerTransactionId: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

function normalizePaymentStatus(status: string): PaymentStatus {
  if (status === "pending" || status === "failed" || status === "refunded") {
    return status;
  }
  return "succeeded";
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return { ...(metadata as Record<string, unknown>) };
}

function toJsonObject(
  metadata: Record<string, unknown>,
): Prisma.InputJsonValue {
  return metadata as Prisma.InputJsonValue;
}

function mapUserPaymentRow(row: {
  id: string;
  user_id: number;
  amount: number | string;
  currency: string;
  transaction_type: string;
  status: string;
  provider: string | null;
  provider_transaction_id: string | null;
  description: string | null;
  metadata: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}): UserPaymentRow {
  return {
    id: row.id,
    userId: row.user_id,
    amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
    currency: row.currency,
    transactionType: row.transaction_type === "refund" ? "refund" : "payment",
    status: normalizePaymentStatus(row.status),
    provider: row.provider,
    providerTransactionId: row.provider_transaction_id,
    description: row.description,
    metadata: normalizeMetadata(row.metadata),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function selectPayments(input: PaymentsListQuery): Promise<{
  rows: PaymentRow[];
  total: number;
}> {
  const whereConditions: Prisma.Sql[] = [];
  if (input.status) {
    whereConditions.push(Prisma.sql`p.status = ${input.status}`);
  }
  if (input.transactionType) {
    whereConditions.push(
      Prisma.sql`p.transaction_type = ${input.transactionType}`,
    );
  }
  if (input.search) {
    whereConditions.push(
      Prisma.sql`(
        p.id::text ILIKE ${`%${input.search}%`}
        OR u.user_name ILIKE ${`%${input.search}%`}
        OR u.email ILIKE ${`%${input.search}%`}
      )`,
    );
  }

  const whereClause =
    whereConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}`
      : Prisma.empty;

  const orderBySql =
    input.sortBy === "amount"
      ? Prisma.sql`p.amount`
      : input.sortBy === "status"
        ? Prisma.sql`p.status`
        : input.sortBy === "transactionType"
          ? Prisma.sql`p.transaction_type`
          : Prisma.sql`p.date`;
  const sortOrderSql =
    input.sortOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const offset = (input.page - 1) * input.pageSize;

  const rows = await getPrisma().$queryRaw<
    Array<{
      id: string;
      date: Date;
      user_id: number;
      user_name: string;
      email: string;
      amount: number | string;
      currency: string;
      status: string;
      provider: string | null;
      provider_transaction_id: string | null;
      description: string | null;
      metadata: unknown;
      original_payment_id: string | null;
      refund_reason: string | null;
      transaction_type: string;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT
      p.id,
      p.date,
      p.user_id,
      u.user_name,
      u.email,
      p.amount,
      p.currency,
      p.status,
      p.provider,
      p.provider_transaction_id,
      p.description,
      p.metadata,
      p.original_payment_id,
      p.refund_reason,
      p.transaction_type,
      p.created_at,
      p.updated_at
    FROM payments p
    JOIN users u ON u.id = p.user_id
    ${whereClause}
    ORDER BY ${orderBySql} ${sortOrderSql}
    LIMIT ${input.pageSize}
    OFFSET ${offset}
  `;
  const totalRows = await getPrisma().$queryRaw<
    Array<{ total: bigint | number }>
  >`
    SELECT COUNT(*)::bigint as total
    FROM payments p
    JOIN users u ON u.id = p.user_id
    ${whereClause}
  `;
  const total = Number(totalRows[0]?.total ?? 0);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      date:
        row.date instanceof Date ? row.date.toISOString() : String(row.date),
      userId: row.user_id,
      userName: row.user_name,
      email: row.email,
      amount: typeof row.amount === "number" ? row.amount : Number(row.amount),
      currency: row.currency,
      status: normalizePaymentStatus(row.status),
      provider: row.provider,
      providerTransactionId: row.provider_transaction_id,
      description: row.description,
      metadata: row.metadata,
      originalPaymentId: row.original_payment_id,
      refundReason: row.refund_reason,
      transactionType: row.transaction_type === "refund" ? "refund" : "payment",
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      updatedAt:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    })),
    total,
  };
}

export async function createPendingSubscriptionPayment(input: {
  userId: number;
  amount: number;
  currency: string;
  provider: string;
  description: string;
  metadata: Record<string, unknown>;
}): Promise<UserPaymentRow> {
  const payment = await getPrisma().payment.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      currency: input.currency,
      status: "pending",
      provider: input.provider,
      description: input.description,
      metadata: toJsonObject(input.metadata),
      transactionType: "payment",
    },
  });

  return {
    id: payment.id,
    userId: payment.userId,
    amount: payment.amount,
    currency: payment.currency,
    transactionType: "payment",
    status: payment.status,
    provider: payment.provider,
    providerTransactionId: payment.providerTransactionId,
    description: payment.description,
    metadata: normalizeMetadata(payment.metadata),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export async function selectPaymentById(
  paymentId: string,
): Promise<UserPaymentRow | null> {
  const rows = await getPrisma().$queryRaw<
    Array<{
      id: string;
      user_id: number;
      amount: number | string;
      currency: string;
      transaction_type: string;
      status: string;
      provider: string | null;
      provider_transaction_id: string | null;
      description: string | null;
      metadata: unknown;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT
      p.id,
      p.user_id,
      p.amount,
      p.currency,
      p.transaction_type,
      p.status,
      p.provider,
      p.provider_transaction_id,
      p.description,
      p.metadata,
      p.created_at,
      p.updated_at
    FROM payments p
    WHERE p.id = ${paymentId}::uuid
    LIMIT 1
  `;

  const row = rows[0];
  return row ? mapUserPaymentRow(row) : null;
}

export async function selectPaymentByProviderTransactionIdForUser(
  providerTransactionId: string,
  userId: number,
): Promise<UserPaymentRow | null> {
  const rows = await getPrisma().$queryRaw<
    Array<{
      id: string;
      user_id: number;
      amount: number | string;
      currency: string;
      transaction_type: string;
      status: string;
      provider: string | null;
      provider_transaction_id: string | null;
      description: string | null;
      metadata: unknown;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT
      p.id,
      p.user_id,
      p.amount,
      p.currency,
      p.transaction_type,
      p.status,
      p.provider,
      p.provider_transaction_id,
      p.description,
      p.metadata,
      p.created_at,
      p.updated_at
    FROM payments p
    WHERE p.provider_transaction_id = ${providerTransactionId}
      AND p.user_id = ${userId}
    ORDER BY p.created_at DESC
    LIMIT 1
  `;

  const row = rows[0];
  return row ? mapUserPaymentRow(row) : null;
}

export async function selectPaymentByIdForUser(
  paymentId: string,
  userId: number,
): Promise<UserPaymentRow | null> {
  const rows = await getPrisma().$queryRaw<
    Array<{
      id: string;
      user_id: number;
      amount: number | string;
      currency: string;
      transaction_type: string;
      status: string;
      provider: string | null;
      provider_transaction_id: string | null;
      description: string | null;
      metadata: unknown;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT
      p.id,
      p.user_id,
      p.amount,
      p.currency,
      p.transaction_type,
      p.status,
      p.provider,
      p.provider_transaction_id,
      p.description,
      p.metadata,
      p.created_at,
      p.updated_at
    FROM payments p
    WHERE p.id = ${paymentId}::uuid
      AND p.user_id = ${userId}
    LIMIT 1
  `;

  const row = rows[0];
  return row ? mapUserPaymentRow(row) : null;
}

export async function selectPaymentsByUserId(
  userId: number,
): Promise<UserPaymentRow[]> {
  const rows = await getPrisma().$queryRaw<
    Array<{
      id: string;
      user_id: number;
      amount: number | string;
      currency: string;
      transaction_type: string;
      status: string;
      provider: string | null;
      provider_transaction_id: string | null;
      description: string | null;
      metadata: unknown;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT
      p.id,
      p.user_id,
      p.amount,
      p.currency,
      p.transaction_type,
      p.status,
      p.provider,
      p.provider_transaction_id,
      p.description,
      p.metadata,
      p.created_at,
      p.updated_at
    FROM payments p
    WHERE p.user_id = ${userId}
    ORDER BY p.date DESC
  `;
  return rows.map((row) => mapUserPaymentRow(row));
}

export async function markPaymentSucceeded(input: {
  paymentId: string;
  providerTransactionId: string;
  metadataPatch?: Record<string, unknown>;
}): Promise<UserPaymentRow> {
  return await getPrisma().$transaction(async (tx) => {
    const current = await tx.payment.findUnique({
      where: { id: input.paymentId },
    });
    if (!current) {
      throw new Error("payment not found");
    }

    const nextMetadata = {
      ...(normalizeMetadata(current.metadata) ?? {}),
      ...(input.metadataPatch ?? {}),
    };

    const updated = await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: "succeeded",
        providerTransactionId: input.providerTransactionId,
        metadata: toJsonObject(nextMetadata),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      amount: updated.amount,
      currency: updated.currency,
      transactionType: updated.transactionType,
      status: updated.status,
      provider: updated.provider,
      providerTransactionId: updated.providerTransactionId,
      description: updated.description,
      metadata: normalizeMetadata(updated.metadata),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}

export async function markPaymentFailed(input: {
  paymentId: string;
  metadataPatch?: Record<string, unknown>;
}): Promise<UserPaymentRow> {
  return await getPrisma().$transaction(async (tx) => {
    const current = await tx.payment.findUnique({
      where: { id: input.paymentId },
    });
    if (!current) {
      throw new Error("payment not found");
    }

    const nextMetadata = {
      ...(normalizeMetadata(current.metadata) ?? {}),
      ...(input.metadataPatch ?? {}),
    };

    const updated = await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        status: "failed",
        metadata: toJsonObject(nextMetadata),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      amount: updated.amount,
      currency: updated.currency,
      transactionType: updated.transactionType,
      status: updated.status,
      provider: updated.provider,
      providerTransactionId: updated.providerTransactionId,
      description: updated.description,
      metadata: normalizeMetadata(updated.metadata),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}

export async function updatePendingPaymentCheckoutData(input: {
  paymentId: string;
  providerTransactionId?: string | null;
  metadataPatch: Record<string, unknown>;
}): Promise<UserPaymentRow> {
  return await getPrisma().$transaction(async (tx) => {
    const current = await tx.payment.findUnique({
      where: { id: input.paymentId },
    });
    if (!current) {
      throw new Error("payment not found");
    }
    if (current.status !== "pending") {
      throw new Error("payment is not pending");
    }

    const nextMetadata = {
      ...(normalizeMetadata(current.metadata) ?? {}),
      ...(input.metadataPatch ?? {}),
    };

    const updated = await tx.payment.update({
      where: { id: input.paymentId },
      data: {
        providerTransactionId:
          input.providerTransactionId ?? current.providerTransactionId,
        metadata: toJsonObject(nextMetadata),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      amount: updated.amount,
      currency: updated.currency,
      transactionType: updated.transactionType,
      status: updated.status,
      provider: updated.provider,
      providerTransactionId: updated.providerTransactionId,
      description: updated.description,
      metadata: normalizeMetadata(updated.metadata),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
}

export async function refundPaymentById(input: {
  paymentId: string;
  reason: string;
  adminUserId: number;
}): Promise<{ originalPaymentId: string; refundPaymentId: string }> {
  return await getPrisma().$transaction(async (tx) => {
    const originalPayment = await tx.payment.findUnique({
      where: { id: input.paymentId },
    });
    if (!originalPayment) {
      throw new Error("payment not found");
    }
    if (originalPayment.transactionType !== "payment") {
      throw new Error("only payment transaction can be refunded");
    }
    if (originalPayment.status !== "succeeded") {
      throw new Error("only succeeded payment can be refunded");
    }

    const existingRefund = await tx.payment.findFirst({
      where: {
        originalPaymentId: originalPayment.id,
        transactionType: "refund",
      },
      select: { id: true },
    });
    if (existingRefund) {
      throw new Error("payment already refunded");
    }

    await tx.payment.update({
      where: { id: originalPayment.id },
      data: {
        status: "refunded",
        refundReason: input.reason,
        metadata: toJsonObject({
          ...(normalizeMetadata(originalPayment.metadata) ?? {}),
          refundedByAdminUserId: input.adminUserId,
          refundedAt: new Date().toISOString(),
          refundReason: input.reason,
        }),
      },
    });

    const refundPayment = await tx.payment.create({
      data: {
        userId: originalPayment.userId,
        amount: originalPayment.amount,
        currency: originalPayment.currency,
        status: "succeeded",
        provider: originalPayment.provider,
        providerTransactionId: originalPayment.providerTransactionId,
        description: `refund for payment ${originalPayment.id}`,
        metadata: toJsonObject({
          source: "admin_manual_refund",
          refundedByAdminUserId: input.adminUserId,
        }),
        originalPaymentId: originalPayment.id,
        refundReason: input.reason,
        transactionType: "refund",
      },
    });

    return {
      originalPaymentId: originalPayment.id,
      refundPaymentId: refundPayment.id,
    };
  });
}
