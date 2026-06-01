import type { Priority } from "../types";

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Avatar fallback gradients. A deterministic hash of the seed (student id or
// sender name) picks one, so the same person always gets the same colour.
export const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#2c46e0,#6a7bff)",
  "linear-gradient(135deg,#0e9a6e,#3ecfa3)",
  "linear-gradient(135deg,#c03a2b,#e8715e)",
  "linear-gradient(135deg,#7c3aed,#a78bfa)",
  "linear-gradient(135deg,#b45309,#f59e0b)",
  "linear-gradient(135deg,#0369a1,#38bdf8)",
];

export function avatarGradient(seed: string): string {
  const n = seed.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length];
}

const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};
export const priorityLabel = (p: Priority) => PRIORITY_LABEL[p];

/** "5 Jun 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Deterministic dummy avatar photo for a student id. */
export function studentPhoto(id: string, size = 160): string {
  return `https://i.pravatar.cc/${size}?u=${encodeURIComponent(id)}`;
}

/** Human label for a due date relative to today, e.g. "Due in 3 days", "Overdue by 2 days". */
export function relativeDue(
  iso: string,
  now: Date = new Date(),
): { label: string; overdue: boolean } {
  const due = new Date(`${iso}T23:59:59`);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((due.getTime() - now.getTime()) / dayMs);
  if (days < 0) {
    const n = Math.abs(days);
    return { label: `Overdue by ${n} day${n === 1 ? "" : "s"}`, overdue: true };
  }
  if (days === 0) return { label: "Due today", overdue: false };
  if (days === 1) return { label: "Due tomorrow", overdue: false };
  if (days < 31) return { label: `Due in ${days} days`, overdue: false };
  const months = Math.round(days / 30);
  return { label: `Due in ${months} month${months === 1 ? "" : "s"}`, overdue: false };
}

/** Relative-ish label for message timestamps, e.g. "2 days ago". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}
