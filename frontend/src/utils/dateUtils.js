/**
 * parseUTCDate — converts a backend UTC datetime string to a JS Date in local time.
 *
 * The backend stores datetime.utcnow() values WITHOUT the 'Z' timezone suffix.
 * Without the 'Z', browsers may interpret the string as LOCAL time instead of UTC,
 * causing timestamps to be off by the user's UTC offset (e.g. -5:30 for IST).
 *
 * This helper appends 'Z' if missing, so JS correctly parses it as UTC and
 * automatically converts to the user's local timezone for display.
 *
 * Usage:
 *   import { parseUTCDate } from "../../utils/dateUtils";
 *   format(parseUTCDate(created_at), "MMM d, yyyy")
 *   formatDistanceToNow(parseUTCDate(created_at), { addSuffix: true })
 */
export function parseUTCDate(dateStr) {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  return new Date(s.endsWith("Z") ? s : s + "Z");
}

/**
 * Formats a UTC datetime string (from backend) as a human-readable local time.
 * e.g. "Jul 14, 2026 · 1:04 PM"
 */
export function formatUTCDate(dateStr, fmt = "MMM d, yyyy · h:mm a") {
  const { format } = require("date-fns");
  return format(parseUTCDate(dateStr), fmt);
}
