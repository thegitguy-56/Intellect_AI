// Explicit locale everywhere a date is rendered — Node's default locale on
// the server and the browser's default locale on the client can differ
// (e.g. en-US vs en-GB), which produces a server/client markup mismatch and
// a full hydration error in any client component that formats a date.
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US");
}
