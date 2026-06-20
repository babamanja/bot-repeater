export const dateFormat = "YYYY-MM-DD HH:mm";

type DateInput = string | Date | number | null | undefined;

const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

function parseDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatRelativeTime(value: DateInput, locale?: string): string {
  const date = parseDate(value);
  if (!date) {
    return "—";
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const absoluteDiff = Math.abs(diffSeconds);

  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (absoluteDiff >= secondsInUnit || unit === "second") {
      return formatter.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }

  return formatter.format(0, "second");
}

export function formatAbsoluteTime(value: DateInput): string {
  const date = parseDate(value);
  if (!date) {
    return "—";
  }

  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())} ${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
}
