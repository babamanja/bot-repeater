import { useTranslation } from "react-i18next";

import type { DataTableProps } from "./dataListTypes";
import { joinClassNames } from "./joinClassNames";

export default function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t("table.empty");

  return (
    <div className={joinClassNames("data-table-wrapper", className)}>
      <table className="data-table">
        <thead className="data-table__thead">
          <tr>
            {columns.map((column) => (
              <th
                className={joinClassNames("data-table__th", column.cellClassName)}
                key={column.id}
              >
                {column.header ?? t(`table.${column.id}`, { defaultValue: column.label })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="data-table__tbody">
          {data.length > 0 ? (
            data.map((row) => (
              <tr className="data-table__tr" key={getRowKey(row)}>
                {columns.map((column) => (
                  <td
                    className={joinClassNames("data-table__td", column.cellClassName)}
                    key={column.id}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr className="data-table__tr">
              <td className="data-table__td" colSpan={columns.length}>
                {resolvedEmptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
