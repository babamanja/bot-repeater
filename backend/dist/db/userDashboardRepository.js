import { getPrisma } from "./prisma.js";
function toScorePercent(correctCount, questionCount) {
    return Math.round((correctCount / questionCount) * 100);
}
export async function selectUserDashboardStats(userId) {
    const [quizzesGenerated, attempts] = await Promise.all([
        getPrisma().quiz.count({
            where: {
                createdBy: userId,
                status: { in: ["published", "ready_to_edit"] },
            },
        }),
        getPrisma().quizAttempt.findMany({
            where: { userId, questionCount: { gt: 0 } },
            select: { correctCount: true, questionCount: true },
        }),
    ]);
    const scorePercents = attempts.map((attempt) => toScorePercent(attempt.correctCount, attempt.questionCount));
    const quizzesCompleted = scorePercents.length;
    const averageScorePercent = quizzesCompleted > 0
        ? Math.round(scorePercents.reduce((sum, value) => sum + value, 0) / quizzesCompleted)
        : null;
    const bestScorePercent = quizzesCompleted > 0 ? Math.max(...scorePercents) : null;
    return {
        quizzesGenerated,
        quizzesCompleted,
        averageScorePercent,
        bestScorePercent,
    };
}
