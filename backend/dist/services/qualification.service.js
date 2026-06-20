import * as qualificationRepository from "../db/qualificationRepository.js";
const DEFAULT_QUESTIONS = [
    {
        id: "q1",
        prompt: "What is your current role or study level?",
        options: ["School student", "University student", "Professional", "Other"],
    },
    {
        id: "q2",
        prompt: "What is your main goal with this platform?",
        options: [
            "Prepare for exams",
            "Improve general knowledge",
            "Practice daily",
            "Other",
        ],
    },
];
const QUALIFICATION_SKIP_DEFER_DAYS = 7;
function normalizeQuestions(input) {
    if (!Array.isArray(input)) {
        throw new Error("questions must be an array");
    }
    const questions = input
        .map((item, index) => {
        if (!item || typeof item !== "object") {
            return null;
        }
        const candidate = item;
        const id = typeof candidate.id === "string" && candidate.id.trim().length > 0
            ? candidate.id.trim()
            : `q${index + 1}`;
        const prompt = typeof candidate.prompt === "string" ? candidate.prompt.trim() : "";
        if (!prompt || !Array.isArray(candidate.options)) {
            return null;
        }
        const options = candidate.options
            .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
            .filter((opt) => opt.length > 0)
            .slice(0, 10);
        if (options.length < 2) {
            return null;
        }
        return { id, prompt, options };
    })
        .filter((item) => item !== null);
    if (questions.length === 0) {
        throw new Error("at least one question is required");
    }
    return questions.slice(0, 30);
}
export async function getQualificationTemplate() {
    const stored = await qualificationRepository.selectQualificationTemplate();
    return {
        ok: true,
        questions: stored?.questions.length ? stored.questions : DEFAULT_QUESTIONS,
        defaultQuestions: DEFAULT_QUESTIONS,
    };
}
export async function updateQualificationTemplate(input) {
    const questions = normalizeQuestions(input.questions);
    await qualificationRepository.upsertQualificationTemplate(questions);
    return { ok: true, questions };
}
export async function getMyQualificationState(userId, role) {
    if (role === "admin") {
        return {
            ok: true,
            completed: true,
            shouldPrompt: false,
            deferredUntil: null,
            questions: [],
            completedAt: null,
        };
    }
    const [template, completedAt, deferredUntil] = await Promise.all([
        qualificationRepository.selectQualificationTemplate(),
        qualificationRepository.selectQualificationCompletedAt(userId),
        qualificationRepository.selectQualificationDeferredUntil(userId),
    ]);
    const isCompleted = completedAt !== null;
    const deferredUntilDate = deferredUntil ? new Date(deferredUntil) : null;
    const isDeferred = !isCompleted &&
        deferredUntilDate !== null &&
        !Number.isNaN(deferredUntilDate.getTime()) &&
        deferredUntilDate.getTime() > Date.now();
    return {
        ok: true,
        completed: isCompleted,
        shouldPrompt: !isCompleted && !isDeferred,
        deferredUntil: isDeferred ? deferredUntil : null,
        completedAt,
        questions: template?.questions.length
            ? template.questions
            : DEFAULT_QUESTIONS,
    };
}
export async function skipMyQualification(userId, role) {
    if (role === "admin") {
        return { ok: false, status: 403, error: "forbidden" };
    }
    const completedAt = await qualificationRepository.selectQualificationCompletedAt(userId);
    if (completedAt) {
        return { ok: true };
    }
    const deferredUntilDate = new Date(Date.now() + QUALIFICATION_SKIP_DEFER_DAYS * 24 * 60 * 60 * 1000);
    await qualificationRepository.upsertQualificationSkip({
        userId,
        deferredUntil: deferredUntilDate.toISOString(),
    });
    return { ok: true };
}
export async function submitMyQualification(userId, role, input) {
    if (role === "admin") {
        return { ok: false, status: 403, error: "forbidden" };
    }
    if (!Array.isArray(input.answers)) {
        return {
            ok: false,
            status: 400,
            error: "answers must be an array",
        };
    }
    const answers = input.answers
        .map((item) => {
        if (!item || typeof item !== "object") {
            return null;
        }
        const obj = item;
        const questionId = typeof obj.questionId === "string" ? obj.questionId.trim() : "";
        const prompt = typeof obj.prompt === "string" ? obj.prompt.trim() : "";
        const selectedOption = typeof obj.selectedOption === "string" &&
            obj.selectedOption.trim().length > 0
            ? obj.selectedOption.trim()
            : null;
        const freeText = typeof obj.freeText === "string" ? obj.freeText.trim() : "";
        if (!questionId || !prompt || (!selectedOption && !freeText)) {
            return null;
        }
        return { questionId, prompt, selectedOption, freeText };
    })
        .filter((item) => item !== null);
    if (answers.length === 0) {
        return { ok: false, status: 400, error: "answers are required" };
    }
    await qualificationRepository.upsertQualificationSubmission({
        userId,
        answers,
    });
    return { ok: true };
}
function parseSubmissionAnswers(raw) {
    if (Array.isArray(raw)) {
        const answers = raw
            .map((item) => {
            if (!item || typeof item !== "object") {
                return null;
            }
            const obj = item;
            const questionId = typeof obj.questionId === "string" ? obj.questionId.trim() : "";
            const prompt = typeof obj.prompt === "string" ? obj.prompt.trim() : "";
            const selectedOption = typeof obj.selectedOption === "string" && obj.selectedOption.trim().length > 0
                ? obj.selectedOption.trim()
                : null;
            const freeText = typeof obj.freeText === "string" ? obj.freeText.trim() : "";
            if (!questionId || !prompt) {
                return null;
            }
            return { questionId, prompt, selectedOption, freeText };
        })
            .filter((item) => item !== null);
        return { status: "completed", deferredUntil: null, answers };
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const meta = raw.meta;
        if (meta && typeof meta === "object") {
            const status = meta.status;
            const deferredUntilRaw = meta.deferredUntil;
            const deferredUntil = typeof deferredUntilRaw === "string" && deferredUntilRaw.trim().length > 0
                ? deferredUntilRaw
                : null;
            if (status === "skipped") {
                return { status: "skipped", deferredUntil, answers: [] };
            }
        }
    }
    return { status: "skipped", deferredUntil: null, answers: [] };
}
export async function listQualificationSubmissionsForAdmin(input) {
    const result = await qualificationRepository.selectQualificationSubmissions(input);
    const totalPages = Math.max(1, Math.ceil(result.total / input.pageSize));
    const items = result.items.map((row) => {
        const parsed = parseSubmissionAnswers(row.answers);
        return {
            id: row.id,
            userId: row.userId,
            userName: row.userName,
            email: row.email,
            status: parsed.status,
            submittedAt: row.submittedAt.toISOString(),
            completedAt: row.qualificationCompletedAt
                ? row.qualificationCompletedAt.toISOString()
                : null,
            deferredUntil: parsed.deferredUntil,
            answers: parsed.answers,
        };
    });
    return {
        ok: true,
        items,
        pagination: {
            page: input.page,
            pageSize: input.pageSize,
            total: result.total,
            totalPages,
        },
    };
}
