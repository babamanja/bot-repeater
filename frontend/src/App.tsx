import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes } from "react-router-dom";

import { identifyAnalyticsUser, resetAnalyticsUser } from "./analytics";
import { refreshSession } from "./api/auth";
import CookieConsentBanner from "./components/CookieConsent/CookieConsentBanner";
import AppLayout from "./components/Layout/AppLayout";
import AccountDeletedPage from "./pages/AccountDeletedPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminPromptPage from "./pages/admin/AdminPromptPage";
import AdminQualificationPage from "./pages/admin/AdminQualificationPage";
import AdminQuizzesPage from "./pages/admin/AdminQuizzesPage";
import AdminTokenAnalyticsPage from "./pages/admin/AdminTokenAnalyticsPage";
import AdminTokenSettingsPage from "./pages/admin/AdminTokenSettingsPage";
import AdminUserDetailsPage from "./pages/admin/AdminUserDetailsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AuthPage from "./pages/AuthPage";
import LandingRoutePage from "./pages/landing/LandingRoutePage";
import NotFoundPage from "./pages/NotFoundPage";
import BillingHistoryPage from "./pages/payments/BillingHistoryPage";
import MySubscriptionPage from "./pages/payments/MySubscriptionPage";
import PaymentCheckoutPage from "./pages/payments/PaymentCheckoutPage";
import PaymentResultPage from "./pages/payments/PaymentResultPage";
import PaymentReturnPage from "./pages/payments/PaymentReturnPage";
import ProfilePage from "./pages/ProfilePage";
import FeedbackPage from "./pages/FeedbackPage";
import { homePathForRole } from "./paths";
import { getSessionSnapshot, setStoredSession, subscribeToSession } from "./userStorage";

type RouteConfig = {
  path: string;
  element: ReactNode;
  roles: ReadonlyArray<"user" | "admin">;
};

const ROUTES: ReadonlyArray<RouteConfig> = [
  { path: "/dashboard", element: <Navigate to="/my-subscription" replace />, roles: ["user"] },
  { path: "/admin/dashboard", element: <AdminDashboardPage />, roles: ["admin"] },
  { path: "/admin/users", element: <AdminUsersPage />, roles: ["admin"] },
  { path: "/admin/users/:userId", element: <AdminUserDetailsPage />, roles: ["admin"] },
  { path: "/admin/payments", element: <AdminPaymentsPage />, roles: ["admin"] },
  { path: "/admin/prompt", element: <AdminPromptPage />, roles: ["admin"] },
  { path: "/admin/qualification", element: <AdminQualificationPage />, roles: ["admin"] },
  { path: "/admin/feedback", element: <AdminFeedbackPage />, roles: ["admin"] },
  { path: "/admin/quizzes", element: <AdminQuizzesPage />, roles: ["admin"] },
  { path: "/admin/token-settings", element: <AdminTokenSettingsPage />, roles: ["admin"] },
  { path: "/admin/token-analytics", element: <AdminTokenAnalyticsPage />, roles: ["admin"] },
  { path: "/my-subscription", element: <MySubscriptionPage />, roles: ["user"] },
  { path: "/payment/checkout", element: <PaymentCheckoutPage />, roles: ["user"] },
  { path: "/payment/success", element: <PaymentResultPage outcome="success" />, roles: ["user"] },
  { path: "/payment/failed", element: <PaymentResultPage outcome="failed" />, roles: ["user"] },
  { path: "/payment/canceled", element: <PaymentResultPage outcome="canceled" />, roles: ["user"] },
  { path: "/payment/pending", element: <PaymentResultPage outcome="pending" />, roles: ["user"] },
  { path: "/billing-history", element: <BillingHistoryPage />, roles: ["user"] },
  { path: "/profile", element: <ProfilePage />, roles: ["user"] },
  { path: "/feedback", element: <FeedbackPage />, roles: ["user"] },
  { path: "/payment", element: <PaymentReturnPage />, roles: ["user"] },
];

export default function App() {
  const { t } = useTranslation();
  const [isHydrating, setIsHydrating] = useState(true);
  const [sessionState, setSessionState] = useState(() => getSessionSnapshot());

  useEffect(() => {
    const unsubscribe = subscribeToSession(() => {
      setSessionState(getSessionSnapshot());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (sessionState.user?.id) {
      identifyAnalyticsUser(String(sessionState.user.id));
      return;
    }
    resetAnalyticsUser();
  }, [sessionState.user?.id]);

  useEffect(() => {
    let isMounted = true;
    refreshSession()
      .then((session) => {
        if (!isMounted) {
          return;
        }
        setStoredSession({ user: session.user, token: session.token });
      })
      .catch(() => {
        // Ignore startup refresh errors. User can still authenticate manually.
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrating(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isHydrating) {
    return (
      <div className="app-boot" role="status" aria-live="polite">
        {t("app.loading")}
      </div>
    );
  }

  function resolveRouteElement(route: RouteConfig) {
    const role = sessionState.user?.role ?? "guest";
    if (route.roles.includes(role as "user" | "admin")) {
      return route.element;
    }
    if (role === "guest") {
      return <Navigate to="/" replace />;
    }
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingRoutePage />} />
        <Route path="/privacy" element={<Navigate to="/?legal=privacy" replace />} />
        <Route path="/terms" element={<Navigate to="/?legal=terms" replace />} />
        <Route path="/refund" element={<Navigate to="/?legal=refund" replace />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/account-deleted" element={<AccountDeletedPage />} />
        <Route element={<AppLayout />}>
          {ROUTES.map((route) => (
            <Route key={route.path} path={route.path} element={resolveRouteElement(route)} />
          ))}
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <CookieConsentBanner />
    </>
  );
}
