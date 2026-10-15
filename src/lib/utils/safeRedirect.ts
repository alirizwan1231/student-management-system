// Only allow same-site relative paths, so a crafted link cannot bounce a
// user to another website after login (open-redirect protection).
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
