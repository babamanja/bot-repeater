import { useTranslation } from "react-i18next";

import { formatRelativeTime, isReviewOverdue } from "../utils/convertTime";

type ReviewDueTimeProps = {
  nextReviewMs: number;
};

export default function ReviewDueTime({ nextReviewMs }: ReviewDueTimeProps) {
  const { t } = useTranslation();
  const overdue = isReviewOverdue(nextReviewMs);

  if (overdue) {
    return <span className="review-due review-due--overdue">{t("reviewSchedule.now")}</span>;
  }

  return <span className="review-due">{formatRelativeTime(nextReviewMs)}</span>;
}
