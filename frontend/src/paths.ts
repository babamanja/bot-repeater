export {
  LEGAL_QUERY_KEY,
  legalDocumentHref,
  parseLegalDocumentId,
  type LegalDocumentId,
} from "./pages/legal/legalQuery";

export const PRIVACY_POLICY_PATH = "/?legal=privacy";
export const TERMS_OF_SERVICE_PATH = "/?legal=terms";
export const REFUND_POLICY_PATH = "/?legal=refund";

export const USER_HOME_PATH = "/my-subscription";
export const FEEDBACK_PATH = "/feedback";

/** Post-login home and sidebar brand target by role. */
export function homePathForRole(role: string | undefined): string {
  return (role ?? "").toLowerCase() === "admin" ? "/admin/dashboard" : USER_HOME_PATH;
}
