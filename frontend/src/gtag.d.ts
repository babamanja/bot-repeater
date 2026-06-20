type GtagCommand = "js" | "config" | "event" | "set";

interface Window {
  dataLayer?: unknown[];
  gtag?: (command: GtagCommand, ...args: unknown[]) => void;
}
