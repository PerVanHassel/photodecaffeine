import type { ProjectStatus } from "../api";
import type { Tone } from "../ui/base";

/**
 * Project status vocabulary.
 *
 * The stored values are the English ones the desktop panel and the client
 * portal already write (`in_progress`, …) — they are data, so they stay put.
 * Only the labels are Dutch, because the app is.
 */
export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "in_progress", label: "In uitvoering" },
  { value: "in_review", label: "Ter review" },
  { value: "delivered", label: "Geleverd" },
  { value: "on_hold", label: "On hold" },
];

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label])
);

export const STATUS_TONE: Record<string, Tone> = {
  in_progress: "copper",
  in_review: "info",
  delivered: "ok",
  on_hold: "warn",
};

/** Rough completion, used for the progress ring on the project screen. */
export const STATUS_PROGRESS: Record<string, number> = {
  in_progress: 0.45,
  in_review: 0.8,
  delivered: 1,
  on_hold: 0.25,
};
