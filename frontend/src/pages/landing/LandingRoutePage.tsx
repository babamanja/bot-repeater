import { Navigate, useSearchParams } from "react-router-dom";

import { isAuthenticatedUser, useSession } from "../../hooks/useSession";
import { homePathForRole } from "../../paths";
import { LEGAL_QUERY_KEY, parseLegalDocumentId } from "../legal/legalQuery";

import { LandingPage } from "./LandingPage";
import { readLandingQuizProgress } from "./hooks/landingQuizProgress";
import "./landing.scss";

export default function LandingRoutePage() {
  const [searchParams] = useSearchParams();
  const { user, token } = useSession();
  const legalDocumentId = parseLegalDocumentId(searchParams.get(LEGAL_QUERY_KEY));
  const landingQuizProgress = readLandingQuizProgress();

  if (
    isAuthenticatedUser(user?.role, token) &&
    !user?.isGuest &&
    !legalDocumentId &&
    !landingQuizProgress
  ) {
    return <Navigate to={homePathForRole(user?.role)} replace />;
  }

  return <LandingPage />;
}
