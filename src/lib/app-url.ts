/**
 * The public origin of this deployment, used for links in emails, redirects
 * and the unsubscribe URL. Set APP_BASE_URL (e.g. https://app.example.com).
 */
export function appBaseUrl(): string {
  const url = process.env["APP_BASE_URL"] ?? process.env["VITE_APP_BASE_URL"];
  if (url) return url.replace(/\/+$/, "");
  console.warn("APP_BASE_URL is not set; links in emails will point at localhost.");
  return "http://localhost:8080";
}
