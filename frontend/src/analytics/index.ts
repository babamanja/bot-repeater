import { createProviders, initializeProviders } from "./providers";
import type { AnalyticsBaseProps, AnalyticsEventName, AnalyticsEventProps } from "./types";

const analyticsEnv = import.meta.env.MODE;
const analyticsAppVersion = import.meta.env.VITE_APP_VERSION ?? "unknown";

const providerEnv = {
  posthogKey: import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim(),
  posthogHost: import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID?.trim(),
  googleAdsId: import.meta.env.VITE_GOOGLE_ADS_ID?.trim(),
  googleAdsSignupSendTo: import.meta.env.VITE_GOOGLE_ADS_SIGNUP_SEND_TO?.trim(),
};

const { providers, trackToMeta, trackPosthogOnly } = createProviders(providerEnv);

export function initializeAnalytics(): void {
  initializeProviders(providerEnv);
}

export function buildAnalyticsContext(): AnalyticsBaseProps {
  return {
    env: analyticsEnv,
    app_version: analyticsAppVersion,
  };
}

export function trackAnalyticsEvent<T extends AnalyticsEventName>(
  event: T,
  props: Omit<AnalyticsEventProps<T>, keyof AnalyticsBaseProps> &
    Partial<Pick<AnalyticsEventProps<T>, keyof AnalyticsBaseProps>>,
): void {
  const payload = {
    ...buildAnalyticsContext(),
    ...props,
  } as AnalyticsEventProps<T>;
  providers.forEach((provider) => {
    provider.track(event, payload);
  });
}

/** Sends the event to PostHog only (skips Meta Pixel). */
export function trackPosthogAnalyticsEvent<T extends AnalyticsEventName>(
  event: T,
  props: Omit<AnalyticsEventProps<T>, keyof AnalyticsBaseProps> &
    Partial<Pick<AnalyticsEventProps<T>, keyof AnalyticsBaseProps>>,
): void {
  const payload = {
    ...buildAnalyticsContext(),
    ...props,
  } as AnalyticsEventProps<T>;
  trackPosthogOnly(event, payload);
}

/** Conversion CTAs: Meta Pixel only. PostHog records clicks via autocapture. */
export function trackUiCtaClick(ctaId: string, ctaLabel?: string): void {
  const pagePath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : "";
  const payload = {
    ...buildAnalyticsContext(),
    cta_id: ctaId,
    ...(ctaLabel ? { cta_label: ctaLabel } : {}),
    page_path: pagePath,
  } as AnalyticsEventProps<"ui_cta_clicked">;
  trackToMeta("ui_cta_clicked", payload);
}

export function identifyAnalyticsUser(userId: string): void {
  providers.forEach((provider) => {
    provider.identify(userId);
  });
}

export function resetAnalyticsUser(): void {
  providers.forEach((provider) => {
    provider.reset();
  });
}

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
