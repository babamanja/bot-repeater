export const LEGAL_DOCUMENT_IDS = ["privacy", "terms", "refund"] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number];

export const LEGAL_QUERY_KEY = "legal";

export function parseLegalDocumentId(value: string | null): LegalDocumentId | null {
  if (value === "privacy" || value === "terms" || value === "refund") {
    return value;
  }
  return null;
}

export function legalDocumentHref(documentId: LegalDocumentId): string {
  return `/?${LEGAL_QUERY_KEY}=${documentId}`;
}
