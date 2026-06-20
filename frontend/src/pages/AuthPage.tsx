import AuthPanel from "../components/auth/AuthPanel";

import "./style.scss";

export default function AuthPage() {
  return (
    <section className="auth-page">
      <AuthPanel variant="page" syncModeFromLocation titleHeading="h1" />
    </section>
  );
}
