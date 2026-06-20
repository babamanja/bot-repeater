import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";

export type FeedbackRow = {
  id: string;
  userId: number;
  category: string;
  message: string;
  createdAt: Date;
};

export async function insertUserFeedback(input: {
  userId: number;
  category: string;
  message: string;
}): Promise<FeedbackRow> {
  const row = await getPrisma().userFeedback.create({
    data: {
      userId: input.userId,
      category: input.category,
      message: input.message,
    },
  });
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    message: row.message,
    createdAt: row.createdAt,
  };
}

export type FeedbackListRow = {
  id: string;
  userId: number;
  userName: string;
  email: string;
  category: string;
  message: string;
  createdAt: Date;
};

export async function selectFeedbackForAdmin(input: {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
}): Promise<{ items: FeedbackListRow[]; total: number }> {
  const offset = (input.page - 1) * input.pageSize;
  const searchPattern =
    input.search && input.search.trim().length > 0
      ? `%${input.search.trim()}%`
      : null;

  const categoryFilter =
    input.category && input.category.trim().length > 0
      ? Prisma.sql`uf.category = ${input.category.trim()}`
      : Prisma.sql`TRUE`;

  const searchFilter = searchPattern
    ? Prisma.sql`(
        u.user_name ILIKE ${searchPattern}
        OR u.email ILIKE ${searchPattern}
        OR uf.message ILIKE ${searchPattern}
      )`
    : Prisma.sql`TRUE`;

  const countRows = await getPrisma().$queryRaw<Array<{ total: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM user_feedback uf
      INNER JOIN users u ON u.id = uf.user_id
      WHERE ${categoryFilter}
        AND ${searchFilter}
    `,
  );
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await getPrisma().$queryRaw<
    Array<{
      id: string;
      user_id: number;
      user_name: string;
      email: string;
      category: string;
      message: string;
      created_at: Date;
    }>
  >(
    Prisma.sql`
      SELECT
        uf.id,
        uf.user_id,
        u.user_name,
        u.email,
        uf.category,
        uf.message,
        uf.created_at
      FROM user_feedback uf
      INNER JOIN users u ON u.id = uf.user_id
      WHERE ${categoryFilter}
        AND ${searchFilter}
      ORDER BY uf.created_at DESC
      LIMIT ${input.pageSize}
      OFFSET ${offset}
    `,
  );

  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      email: row.email,
      category: row.category,
      message: row.message,
      createdAt: row.created_at,
    })),
  };
}
