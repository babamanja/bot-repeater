import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
const QUALIFICATION_TEMPLATE_KEY = "qualification_questionnaire";
function normalizeTemplateValue(value) {
    if (!value || typeof value !== "object") {
        return null;
    }
    const candidate = value;
    if (!Array.isArray(candidate.questions)) {
        return null;
    }
    const questions = candidate.questions
        .map((item, index) => {
        if (!item || typeof item !== "object") {
            return null;
        }
        const question = item;
        const prompt = typeof question.prompt === "string" ? question.prompt.trim() : "";
        const id = typeof question.id === "string" && question.id.trim().length > 0
            ? question.id.trim()
            : `q${index + 1}`;
        if (!prompt || !Array.isArray(question.options)) {
            return null;
        }
        const options = question.options
            .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
            .filter((opt) => opt.length > 0);
        return { id, prompt, options };
    })
        .filter((item) => item !== null);
    return { questions };
}
export async function selectQualificationTemplate() {
    const rows = await getPrisma().$queryRaw(Prisma.sql `SELECT value FROM app_settings WHERE key = ${QUALIFICATION_TEMPLATE_KEY} LIMIT 1`);
    return normalizeTemplateValue(rows[0]?.value ?? null);
}
export async function upsertQualificationTemplate(questions) {
    const payload = JSON.stringify({ questions });
    await getPrisma().$executeRaw(Prisma.sql `
      INSERT INTO app_settings (key, value, created_at, updated_at)
      VALUES (${QUALIFICATION_TEMPLATE_KEY}, ${payload}::jsonb, NOW(), NOW())
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `);
}
export async function selectQualificationCompletedAt(userId) {
    const rows = await getPrisma().$queryRaw(Prisma.sql `
      SELECT qualification_completed_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `);
    const value = rows[0]?.qualification_completed_at ?? null;
    return value ? value.toISOString() : null;
}
export async function selectQualificationDeferredUntil(userId) {
    const rows = await getPrisma().$queryRaw(Prisma.sql `
      SELECT answers
      FROM qualification_submissions
      WHERE user_id = ${userId}
      LIMIT 1
    `);
    const answers = rows[0]?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
        return null;
    }
    const maybeMeta = answers.meta;
    if (!maybeMeta || typeof maybeMeta !== "object") {
        return null;
    }
    const deferredUntilRaw = maybeMeta.deferredUntil;
    if (typeof deferredUntilRaw !== "string" || deferredUntilRaw.trim().length === 0) {
        return null;
    }
    const deferredDate = new Date(deferredUntilRaw);
    if (Number.isNaN(deferredDate.getTime())) {
        return null;
    }
    return deferredDate.toISOString();
}
export async function upsertQualificationSubmission(input) {
    const answersPayload = JSON.stringify(input.answers);
    await getPrisma().$executeRaw(Prisma.sql `
      INSERT INTO qualification_submissions (id, user_id, answers, submitted_at)
      VALUES (gen_random_uuid(), ${input.userId}, ${answersPayload}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        answers = EXCLUDED.answers,
        submitted_at = NOW()
    `);
    await getPrisma().$executeRaw(Prisma.sql `
      UPDATE users
      SET qualification_completed_at = NOW()
      WHERE id = ${input.userId}
    `);
}
export async function upsertQualificationSkip(input) {
    const payload = JSON.stringify({
        meta: {
            status: "skipped",
            deferredUntil: input.deferredUntil,
        },
    });
    await getPrisma().$executeRaw(Prisma.sql `
      INSERT INTO qualification_submissions (id, user_id, answers, submitted_at)
      VALUES (gen_random_uuid(), ${input.userId}, ${payload}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        answers = EXCLUDED.answers,
        submitted_at = NOW()
    `);
}
export async function selectQualificationSubmissions(input) {
    const offset = (input.page - 1) * input.pageSize;
    const searchPattern = input.search && input.search.trim().length > 0
        ? `%${input.search.trim()}%`
        : null;
    const statusFilter = input.status === "completed"
        ? Prisma.sql `jsonb_typeof(qs.answers) = 'array'`
        : input.status === "skipped"
            ? Prisma.sql `qs.answers->'meta'->>'status' = 'skipped'`
            : Prisma.sql `TRUE`;
    const searchFilter = searchPattern
        ? Prisma.sql `(u.user_name ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})`
        : Prisma.sql `TRUE`;
    const countRows = await getPrisma().$queryRaw(Prisma.sql `
      SELECT COUNT(*)::bigint AS total
      FROM qualification_submissions qs
      INNER JOIN users u ON u.id = qs.user_id
      WHERE ${statusFilter}
        AND ${searchFilter}
    `);
    const total = Number(countRows[0]?.total ?? 0);
    const rows = await getPrisma().$queryRaw(Prisma.sql `
      SELECT
        qs.id,
        qs.user_id,
        u.user_name,
        u.email,
        qs.answers,
        qs.submitted_at,
        u.qualification_completed_at
      FROM qualification_submissions qs
      INNER JOIN users u ON u.id = qs.user_id
      WHERE ${statusFilter}
        AND ${searchFilter}
      ORDER BY qs.submitted_at DESC
      LIMIT ${input.pageSize}
      OFFSET ${offset}
    `);
    return {
        total,
        items: rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            email: row.email,
            answers: row.answers,
            submittedAt: row.submitted_at,
            qualificationCompletedAt: row.qualification_completed_at,
        })),
    };
}
