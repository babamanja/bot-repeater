import { PostHog } from "posthog-node";
const posthogApiKey = process.env.POSTHOG_API_KEY?.trim();
const posthogHost = process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
const runtimeEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "local";
const appVersion = process.env.APP_VERSION?.trim() || "unknown";
function createNoopProvider() {
    return {
        captureAuthEvent: () => { },
        shutdown: async () => { },
    };
}
function createPosthogProvider() {
    if (!posthogApiKey) {
        return createNoopProvider();
    }
    const client = new PostHog(posthogApiKey, {
        host: posthogHost,
        flushAt: 1,
        flushInterval: 0,
    });
    return {
        captureAuthEvent: (event) => {
            const distinctId = event.userId ? `user:${event.userId}` : event.requestId || "backend-anon";
            client.capture({
                distinctId,
                event: event.event,
                properties: {
                    auth_method: event.authMethod,
                    flow: event.flow,
                    result: event.result,
                    reason: event.reason,
                    request_id: event.requestId,
                    env: runtimeEnv,
                    app_version: appVersion,
                    source: "backend",
                    user_id: event.userId,
                },
            });
        },
        shutdown: async () => {
            await client.shutdown();
        },
    };
}
const provider = createPosthogProvider();
export function trackAuthEvent(event) {
    provider.captureAuthEvent(event);
}
export async function shutdownAnalytics() {
    await provider.shutdown();
}
