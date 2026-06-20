import posthog from "posthog-js";

import { logAnalyticsOutgoing, trackLogMessage } from "./analyticsConsole";
import { buildChannelPayload, mapToMetaPixelEvent } from "./mappings";
import type { AnalyticsEventName, AnalyticsEventProps, Provider } from "./types";

/** Events that must never be forwarded to Meta (PostHog-only product analytics). */
function isPosthogOnlyEvent(event: AnalyticsEventName): boolean {
  return event === "quiz_list_opened";
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type ProviderEnv = {
  posthogKey?: string;
  posthogHost: string;
  metaPixelId?: string;
  googleAdsId?: string;
  googleAdsSignupSendTo?: string;
};

let providersInitialized = false;

function ensureMetaPixel(pixelId: string): void {
  if (typeof document === "undefined") {
    return;
  }
  if (!window.fbq) {
    const fbq = function fbq(...args: unknown[]) {
      (fbq as unknown as { queue?: unknown[] }).queue = (
        fbq as unknown as { queue?: unknown[] }
      ).queue || [];
      (fbq as unknown as { queue?: unknown[] }).queue?.push(args);
    };
    window.fbq = fbq;
  }
  const existing = document.querySelector<HTMLScriptElement>(
    'script[src="https://connect.facebook.net/en_US/fbevents.js"]',
  );
  if (!existing) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  window.fbq("init", pixelId);
}

export function initializeProviders(env: ProviderEnv): void {
  if (providersInitialized) {
    return;
  }
  providersInitialized = true;

  if (env.posthogKey) {
    posthog.init(env.posthogKey, {
      api_host: env.posthogHost,
      capture_pageview: false,
      autocapture: true,
    });
  }
  if (env.metaPixelId) {
    ensureMetaPixel(env.metaPixelId);
  }
  if (env.googleAdsId && typeof window !== "undefined" && window.gtag) {
    window.gtag("config", env.googleAdsId);
  }
}

export type AnalyticsProvidersBundle = {
  providers: Provider[];
  /** Meta Pixel only (PostHog relies on autocapture for clicks). */
  trackToMeta: <T extends AnalyticsEventName>(event: T, props: AnalyticsEventProps<T>) => void;
  /** PostHog only — use for events that must not hit Meta (e.g. `quiz_list_opened`). */
  trackPosthogOnly: <T extends AnalyticsEventName>(event: T, props: AnalyticsEventProps<T>) => void;
};

export function createProviders(env: ProviderEnv): AnalyticsProvidersBundle {
  const posthogProvider: Provider = {
    track: (event, props) => {
      if (!env.posthogKey) {
        return;
      }
      posthog.capture(event, props);
      logAnalyticsOutgoing({
        message: trackLogMessage(event),
        sentTo: "PostHog",
        metadata: { event, props },
      });
    },
    identify: (userId) => {
      if (!env.posthogKey) {
        return;
      }
      posthog.identify(userId);
      logAnalyticsOutgoing({
        message: "User identified",
        sentTo: "PostHog",
        metadata: { userId },
      });
    },
    reset: () => {
      if (!env.posthogKey) {
        return;
      }
      posthog.reset();
      logAnalyticsOutgoing({
        message: "Analytics user reset",
        sentTo: "PostHog",
        metadata: {},
      });
    },
  };

  const metaPixelProvider: Provider = {
    track: (event, props) => {
      if (isPosthogOnlyEvent(event)) {
        return;
      }
      if (!env.metaPixelId || !window.fbq) {
        return;
      }
      const metaEvent = mapToMetaPixelEvent(event);
      const channelPayload = buildChannelPayload(props);
      if (metaEvent === "CustomEvent") {
        window.fbq("trackCustom", event, channelPayload);
      } else {
        window.fbq("track", metaEvent, channelPayload);
      }
      logAnalyticsOutgoing({
        message: trackLogMessage(event),
        sentTo: "Meta Pixel",
        metadata: {
          event,
          metaEvent,
          metaAction: metaEvent === "CustomEvent" ? "trackCustom" : "track",
          props: channelPayload,
        },
      });
    },
    identify: () => {},
    reset: () => {},
  };

  const googleAdsProvider: Provider = {
    track: (event, props) => {
      if (event !== "auth_signup_succeeded") {
        return;
      }
      if (!env.googleAdsSignupSendTo || typeof window === "undefined" || !window.gtag) {
        return;
      }
      const channelPayload = buildChannelPayload(props);
      window.gtag("event", "conversion", {
        send_to: env.googleAdsSignupSendTo,
        ...channelPayload,
      });
      logAnalyticsOutgoing({
        message: trackLogMessage(event),
        sentTo: "Google Ads",
        metadata: {
          event,
          send_to: env.googleAdsSignupSendTo,
          props: channelPayload,
        },
      });
    },
    identify: () => {},
    reset: () => {},
  };

  return {
    providers: [posthogProvider, metaPixelProvider, googleAdsProvider],
    trackToMeta: (event, props) => {
      metaPixelProvider.track(event, props);
    },
    trackPosthogOnly: (event, props) => {
      posthogProvider.track(event, props);
    },
  };
}
