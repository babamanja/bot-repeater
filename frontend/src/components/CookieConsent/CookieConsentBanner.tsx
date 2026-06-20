import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  acknowledgeCookieNotice,
  hasCookieNoticeAcknowledged,
} from "../../cookieConsentStorage";
import { PRIVACY_POLICY_PATH } from "../../paths";
import Button from "../UI/Button/Button";

import "./cookie-consent.scss";

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasCookieNoticeAcknowledged());
  }, []);

  const acknowledge = useCallback(() => {
    acknowledgeCookieNotice();
    setVisible(false);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label={t("cookieConsent.ariaLabel")}>
      <div className="cookie-consent__inner">
        <p className="cookie-consent__message">
          {t("cookieConsent.message")}{" "}
          <Link className="cookie-consent__link" to={PRIVACY_POLICY_PATH}>
            {t("cookieConsent.privacyLink")}
          </Link>
        </p>
        <Button type="button" style="primary" onClick={acknowledge}>
          {t("cookieConsent.accept")}
        </Button>
      </div>
    </div>
  );
}
