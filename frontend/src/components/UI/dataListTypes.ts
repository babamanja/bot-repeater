import type { ReactNode } from "react";

export type DataListMobileRole =
  | "summary-primary"
  | "summary-secondary"
  | "detail"
  | "footer"
  | "hidden";

export type DataListColumn<T> = {
  id: string;
  label: string;
  header?: ReactNode;
  render: (row: T) => ReactNode;
  mobileRole?: DataListMobileRole;
  /** Span full width in mobile card meta grid */
  mobileWide?: boolean;
  /** Omit from mobile expandable card */
  hideOnMobile?: boolean;
  /** Omit from desktop table */
  desktopHidden?: boolean;
  /** Optional class for desktop table header and body cells */
  cellClassName?: string;
};

export type DataTableProps<T> = {
  columns: DataListColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
};

export type ResponsiveDataListProps<T> = {
  columns: DataListColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  cardClassName?: string;
  getCardClassName?: (row: T) => string;
  defaultOpen?: (row: T) => boolean;
};

export function getDesktopColumns<T>(columns: DataListColumn<T>[]): DataListColumn<T>[] {
  return columns.filter((column) => !column.desktopHidden);
}

export function getMobileColumns<T>(
  columns: DataListColumn<T>[],
  role: DataListMobileRole,
): DataListColumn<T>[] {
  return columns.filter(
    (column) => column.mobileRole === role && !column.hideOnMobile,
  );
}

export function hasMobileDetails<T>(columns: DataListColumn<T>[]): boolean {
  return columns.some(
    (column) =>
      (column.mobileRole === "detail" || column.mobileRole === "footer") &&
      !column.hideOnMobile &&
      !column.desktopHidden,
  );
}
