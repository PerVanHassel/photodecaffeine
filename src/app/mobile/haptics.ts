/**
 * Haptic feedback.
 *
 * Worth being straight about the platform reality: iOS Safari does not
 * implement the Vibration API, so on the iPhone these calls are no-ops. They
 * fire on Android and on any desktop browser that supports it. The abstraction
 * still earns its place — call sites stay declarative, and the day WebKit ships
 * vibration (or the app gets wrapped in Capacitor, where it maps straight onto
 * the native Haptics plugin) this is the only file that changes.
 */

type Pattern = "tap" | "select" | "success" | "warning" | "error" | "impact";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,
  select: 12,
  impact: 22,
  success: [14, 44, 22],
  warning: [20, 70, 20],
  error: [28, 60, 28, 60, 28],
};

const supported = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

export function haptic(pattern: Pattern = "tap") {
  if (!supported()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Some browsers throw when the page isn't visible or has never been
    // interacted with. Feedback failing is never worth breaking the action.
  }
}

export const hapticsAvailable = supported;
