import * as feedbackService from "../services/feedback.service.js";
import { sendServiceFailure } from "./helpers.js";
export async function submitFeedback(req, res) {
    const result = await feedbackService.submitUserFeedback(req.user?.id, req.body ?? {});
    if (result.ok === false) {
        return sendServiceFailure(res, result);
    }
    return res.status(201).json(result.feedback);
}
export async function listFeedbackForAdmin(req, res) {
    const page = Math.max(1, Number(req.query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query?.pageSize) || 20));
    const searchRaw = typeof req.query?.search === "string" ? req.query.search.trim() : "";
    const search = searchRaw.length > 0 ? searchRaw : undefined;
    const categoryRaw = typeof req.query?.category === "string" ? req.query.category.trim() : "";
    const category = categoryRaw.length > 0 ? categoryRaw : undefined;
    const result = await feedbackService.listFeedbackForAdmin({
        page,
        pageSize,
        search,
        category,
    });
    return res.status(200).json({
        items: result.items,
        pagination: result.pagination,
    });
}
