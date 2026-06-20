import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import Card from "./Card";
import DataTable from "./DataTable";
import ExpandableListCard from "./ExpandableListCard";
import {
  getDesktopColumns,
  getMobileColumns,
  type DataListColumn,
  type ResponsiveDataListProps,
} from "./dataListTypes";
import { joinClassNames } from "./joinClassNames";
import "./ResponsiveDataList.scss";

function isEmptyCellContent(content: ReactNode): boolean {
  if (content == null || content === false) {
    return true;
  }
  if (typeof content === "string" && content.trim() === "") {
    return true;
  }
  return false;
}

function getRowMobileItems<T>(columns: DataListColumn<T>[], row: T) {
  return columns
    .map((column) => ({ column, content: column.render(row) }))
    .filter((item) => !isEmptyCellContent(item.content));
}

function renderMobileSummary<T>(
  row: T,
  summaryPrimaryColumns: ReturnType<typeof getMobileColumns<T>>,
  summarySecondaryColumns: ReturnType<typeof getMobileColumns<T>>,
) {
  return (
    <>
      {summaryPrimaryColumns.map((column) => (
        <span key={column.id} className="list-data-card__summary-primary">
          {column.render(row)}
        </span>
      ))}
      {summarySecondaryColumns.map((column) => (
        <span key={column.id} className="list-data-card__summary-secondary">
          {column.render(row)}
        </span>
      ))}
    </>
  );
}

export default function ResponsiveDataList<T>({
  columns,
  data,
  getRowKey,
  emptyMessage,
  className,
  cardClassName,
  getCardClassName,
  defaultOpen,
}: ResponsiveDataListProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t("table.empty");
  const desktopColumns = getDesktopColumns(columns);
  const summaryPrimaryColumns = getMobileColumns(columns, "summary-primary");
  const summarySecondaryColumns = getMobileColumns(columns, "summary-secondary");
  const detailColumns = getMobileColumns(columns, "detail");
  const footerColumns = getMobileColumns(columns, "footer");

  return (
    <div className={joinClassNames("responsive-data-list", className)}>
      <div className="responsive-data-list__cards">
        {data.length === 0 ? (
          <p className="responsive-data-list__empty">{resolvedEmptyMessage}</p>
        ) : (
          data.map((row) => {
            const rowDetailItems = getRowMobileItems(detailColumns, row);
            const rowFooterItems = getRowMobileItems(footerColumns, row);
            const rowExpandable = rowDetailItems.length > 0 || rowFooterItems.length > 0;
            const cardClasses = joinClassNames(
              "list-data-card",
              !rowExpandable && "list-data-card--static",
              cardClassName,
              getCardClassName?.(row),
            );
            const summary = renderMobileSummary(
              row,
              summaryPrimaryColumns,
              summarySecondaryColumns,
            );

            if (!rowExpandable) {
              return (
                <Card key={getRowKey(row)} className={cardClasses} padding="none">
                  <div className="list-expandable-card__summary list-expandable-card__summary--static">
                    {summary}
                  </div>
                </Card>
              );
            }

            return (
              <ExpandableListCard
                key={getRowKey(row)}
                className={cardClasses}
                defaultOpen={defaultOpen?.(row)}
                summary={summary}
              >
                {rowDetailItems.length > 0 ? (
                  <dl className="list-data-card__meta">
                    {rowDetailItems.map(({ column, content }) => (
                      <div
                        key={column.id}
                        className={joinClassNames(
                          "list-data-card__meta-item",
                          column.mobileWide && "list-data-card__meta-item--wide",
                        )}
                      >
                        <dt>{column.label}</dt>
                        <dd>{content}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {rowFooterItems.length > 0 ? (
                  <footer className="list-data-card__footer">
                    {rowFooterItems.map(({ column, content }) => (
                      <div key={column.id} className="list-data-card__footer-item">
                        {content}
                      </div>
                    ))}
                  </footer>
                ) : null}
              </ExpandableListCard>
            );
          })
        )}
      </div>

      <div className="responsive-data-list__table">
        <DataTable
          columns={desktopColumns}
          data={data}
          getRowKey={getRowKey}
          emptyMessage={resolvedEmptyMessage}
        />
      </div>
    </div>
  );
}
