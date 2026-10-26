import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Rolling window for showing "done" and "cancelled" rows on the manage + dashboard pages.
 * Factory runs 24/7 so a calendar-day filter is wrong — rows that are still waiting
 * or loading always stay visible; completed/cancelled rows fall off after this window.
 */
export const DONE_WINDOW_HOURS = 12;
export const DONE_WINDOW_MS = DONE_WINDOW_HOURS * 60 * 60 * 1000;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function usernameToEmail(username: string): string {
  // Supabase auth requires an email format; we synthesize one from the username.
  // The @loader.local domain is a convention — do not route email to it.
  return `${username.toLowerCase().trim()}@loader.local`;
}

export function formatHHMM(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h} ชม. ${m} น.`;
  return `${m} น.`;
}
