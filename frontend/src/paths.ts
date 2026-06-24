export {
  LEGAL_QUERY_KEY,
  legalDocumentHref,
  parseLegalDocumentId,
  type LegalDocumentId,
} from "./pages/legal/legalQuery";

export const PRIVACY_POLICY_PATH = "/?legal=privacy";
export const TERMS_OF_SERVICE_PATH = "/?legal=terms";
export const REFUND_POLICY_PATH = "/?legal=refund";

export const USER_HOME_PATH = "/dashboard";
export const WORDS_PATH = "/words";
export const wordDetailPath = (vocabPairId: number) => `/words/${vocabPairId}`;
export const ADMIN_WORDS_PATH = "/admin/words";
export const ADMIN_TEST_COMPONENTS_PATH = "/admin/test-components";
export const TEST_COMPONENTS_PATH = "/test-components";
export const adminWordDetailPath = (wordId: number) => `/admin/words/${wordId}`;
export const REVIEW_PATH = USER_HOME_PATH;
export const DICTIONARIES_PATH = "/dictionaries";
export const FEEDBACK_PATH = "/feedback";

/** Post-login home and sidebar brand target by role. */
export function homePathForRole(role: string | undefined): string {
  return (role ?? "").toLowerCase() === "admin" ? "/admin/dashboard" : USER_HOME_PATH;
}
