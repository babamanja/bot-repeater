import { getPrisma } from "./prisma.js";
function normalizePlanCode(planCode) {
    return planCode === "premium" ? "premium" : "basic";
}
function normalizeStatus(status) {
    return status === "canceled" || status === "past_due" ? status : "active";
}
function toIsoString(value) {
    if (value == null) {
        return null;
    }
    return value instanceof Date ? value.toISOString() : String(value);
}
function mapSubscriptionRow(row) {
    return {
        id: row.id,
        userId: row.userId,
        planCode: normalizePlanCode(row.planCode),
        status: normalizeStatus(row.status),
        currentPeriodEnd: toIsoString(row.currentPeriodEnd),
        createdAt: toIsoString(row.createdAt),
        paymentId: row.paymentId,
    };
}
export async function ensureDefaultBasicSubscription(userId) {
    const subscription = await getPrisma().subscription.upsert({
        where: { userId },
        update: {},
        create: {
            userId,
            planCode: "basic",
            status: "active",
        },
    });
    return mapSubscriptionRow({
        id: subscription.id,
        userId: subscription.userId,
        planCode: subscription.planCode,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        createdAt: subscription.createdAt,
        paymentId: subscription.paymentId,
    });
}
export async function downgradeExpiredCanceledPremium(userId) {
    if (userId != null) {
        const result = await getPrisma().$executeRaw `
      UPDATE subscriptions
      SET
        plan_code = 'basic',
        status = 'active',
        current_period_end = NULL
      WHERE user_id = ${userId}
        AND plan_code = 'premium'
        AND status = 'canceled'
        AND (
          current_period_end IS NULL
          OR current_period_end < NOW()
        )
    `;
        return Number(result);
    }
    const result = await getPrisma().$executeRaw `
    UPDATE subscriptions
    SET
      plan_code = 'basic',
      status = 'active',
      current_period_end = NULL
    WHERE plan_code = 'premium'
      AND status = 'canceled'
      AND (
        current_period_end IS NULL
        OR current_period_end < NOW()
      )
  `;
    return Number(result);
}
export async function selectSubscriptionByUserId(userId) {
    const rows = await getPrisma().$queryRaw `
    SELECT
      s.id,
      s.user_id,
      s.plan_code,
      s.status,
      s.current_period_end,
      s.created_at,
      s.payment_id
    FROM subscriptions s
    WHERE s.user_id = ${userId}
    LIMIT 1
  `;
    const row = rows[0];
    if (!row) {
        return null;
    }
    return mapSubscriptionRow({
        id: row.id,
        userId: row.user_id,
        planCode: row.plan_code,
        status: row.status,
        currentPeriodEnd: row.current_period_end,
        createdAt: row.created_at,
        paymentId: row.payment_id,
    });
}
export async function activateSubscriptionByUserId(userId, planCode) {
    return await getPrisma().$transaction(async (tx) => {
        const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const amount = planCode === "premium" ? 9.99 : 0;
        const payment = await tx.payment.create({
            data: {
                userId,
                amount,
                currency: "USD",
                status: "succeeded",
                provider: "manual_test",
                description: `Test ${planCode} subscription`,
                metadata: {
                    source: "billing_page_test",
                    planCode,
                },
                transactionType: "payment",
            },
        });
        const subscription = await tx.subscription.upsert({
            where: { userId },
            update: {
                planCode,
                status: "active",
                currentPeriodEnd,
                paymentId: payment.id,
            },
            create: {
                userId,
                planCode,
                status: "active",
                currentPeriodEnd,
                paymentId: payment.id,
            },
        });
        return mapSubscriptionRow({
            id: subscription.id,
            userId: subscription.userId,
            planCode: subscription.planCode,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            createdAt: subscription.createdAt,
            paymentId: subscription.paymentId,
        });
    });
}
export async function activateSubscriptionFromPayment(input) {
    return await getPrisma().$transaction(async (tx) => {
        const periodDays = input.billingPeriod === "yearly" ? 365 : 30;
        const currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);
        const subscription = await tx.subscription.upsert({
            where: { userId: input.userId },
            update: {
                planCode: input.planCode,
                status: "active",
                currentPeriodEnd,
                paymentId: input.paymentId,
            },
            create: {
                userId: input.userId,
                planCode: input.planCode,
                status: "active",
                currentPeriodEnd,
                paymentId: input.paymentId,
            },
        });
        return mapSubscriptionRow({
            id: subscription.id,
            userId: subscription.userId,
            planCode: subscription.planCode,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            createdAt: subscription.createdAt,
            paymentId: subscription.paymentId,
        });
    });
}
export async function grantPremiumByAdmin(input) {
    const subscription = await getPrisma().subscription.upsert({
        where: { userId: input.userId },
        update: {
            planCode: "premium",
            status: "active",
            currentPeriodEnd: input.currentPeriodEnd,
        },
        create: {
            userId: input.userId,
            planCode: "premium",
            status: "active",
            currentPeriodEnd: input.currentPeriodEnd,
        },
    });
    return mapSubscriptionRow({
        id: subscription.id,
        userId: subscription.userId,
        planCode: subscription.planCode,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        createdAt: subscription.createdAt,
        paymentId: subscription.paymentId,
    });
}
export async function cancelSubscriptionByUserId(userId) {
    const subscription = await getPrisma().subscription.findUnique({
        where: { userId },
    });
    if (!subscription || subscription.planCode !== "premium") {
        return null;
    }
    if (subscription.status !== "active" && subscription.status !== "past_due") {
        return null;
    }
    const updated = await getPrisma().subscription.update({
        where: { userId },
        data: {
            status: "canceled",
        },
    });
    return mapSubscriptionRow({
        id: updated.id,
        userId: updated.userId,
        planCode: updated.planCode,
        status: updated.status,
        currentPeriodEnd: updated.currentPeriodEnd,
        createdAt: updated.createdAt,
        paymentId: updated.paymentId,
    });
}
export async function resumeSubscriptionByUserId(userId) {
    const subscription = await getPrisma().subscription.findUnique({
        where: { userId },
    });
    if (!subscription) {
        return null;
    }
    const now = new Date();
    const existingPeriodEnd = subscription.currentPeriodEnd;
    const nextPeriodEnd = existingPeriodEnd && existingPeriodEnd > now
        ? existingPeriodEnd
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const updated = await getPrisma().subscription.update({
        where: { userId },
        data: {
            status: "active",
            currentPeriodEnd: nextPeriodEnd,
        },
    });
    return mapSubscriptionRow({
        id: updated.id,
        userId: updated.userId,
        planCode: updated.planCode,
        status: updated.status,
        currentPeriodEnd: updated.currentPeriodEnd,
        createdAt: updated.createdAt,
        paymentId: updated.paymentId,
    });
}
