import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../../analytics";
import {
  getMyPayments,
  type SubscriptionPaymentLedgerItem,
} from "../../api/subscription";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { formatRelativeTime } from "../../utils/convertTime";

export default function BillingHistoryPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<SubscriptionPaymentLedgerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    trackAnalyticsEvent("billing_history_opened", {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    getMyPayments()
      .then((paymentRows) => {
        if (!isMounted) {
          return;
        }
        setPayments(paymentRows);
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : t("billing.loadFailed"));
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [t]);

  const columns = useMemo<DataListColumn<SubscriptionPaymentLedgerItem>[]>(
    () => [
      {
        id: "billingHistory.date",
        label: t("table.billingHistory.date"),
        mobileRole: "summary-primary",
        render: (payment) => formatRelativeTime(payment.date),
      },
      {
        id: "billingHistory.amount",
        label: t("table.billingHistory.amount"),
        mobileRole: "summary-secondary",
        render: (payment) => `${payment.amount} ${payment.currency.toUpperCase()}`,
      },
      {
        id: "billingHistory.paymentType",
        label: t("table.billingHistory.paymentType"),
        mobileRole: "detail",
        render: (payment) => payment.paymentType,
      },
      {
        id: "billingHistory.status",
        label: t("table.billingHistory.status"),
        mobileRole: "detail",
        render: (payment) => payment.status,
      },
    ],
    [t],
  );

  if (isLoading) {
    return <p>{t("billing.loading")}</p>;
  }

  return (
    <section>
      <h1>{t("billing.title")}</h1>
      <p>{t("billing.subtitle")}</p>
      {error ? <p className="upload-file__error">{error}</p> : null}
      <ResponsiveDataList
        columns={columns}
        data={payments}
        getRowKey={(payment) => payment.paymentId}
        emptyMessage={t("billing.empty")}
      />
    </section>
  );
}
