/** CSP for JSON API responses (Express /api/*). */
export declare const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
/**
 * CSP for the Vite SPA (static HTML/JS on Vercel).
 * Keep vercel.json Content-Security-Policy header in sync — see contentSecurityPolicy.test.ts.
 */
export declare function buildSpaContentSecurityPolicy(): string;
//# sourceMappingURL=contentSecurityPolicy.d.ts.map