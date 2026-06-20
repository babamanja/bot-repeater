import posthog from "posthog-js";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { logAnalyticsOutgoing, trackLogMessage } from "./analyticsConsole";

export function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    const pageLocation = window.location.href;

    const posthogPayload = { $current_url: pageLocation };
    posthog.capture("$pageview", posthogPayload);
    if (import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim()) {
      logAnalyticsOutgoing({
        message: trackLogMessage("$pageview"),
        sentTo: "PostHog",
        metadata: { event: "$pageview", props: posthogPayload },
      });
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
}
