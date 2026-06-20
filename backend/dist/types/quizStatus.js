export const QUIZ_STATUSES = [
    "generating",
    "ready_to_edit",
    "published",
    "failed",
];
export function isQuizStatus(value) {
    return typeof value === "string" && QUIZ_STATUSES.includes(value);
}
/** Quiz has generated content and can be taken or edited. */
export function isQuizPlayable(status) {
    return status === "published" || status === "ready_to_edit";
}
