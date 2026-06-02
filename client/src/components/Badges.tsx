import type { ReactNode } from "react";
import type { Priority, Urgency } from "../types";
import { priorityLabel } from "../utils/format";

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none whitespace-nowrap";

// Full literal strings so Tailwind's scanner keeps them.
const PRIORITY_CLASSES: Record<Priority, string> = {
  urgent: "text-urgent bg-urgent-soft",
  high: "text-high-ink bg-high-soft",
  medium: "text-medium bg-medium-soft",
  low: "text-low bg-low-soft",
};

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={`${PILL_BASE} ${PRIORITY_CLASSES[priority]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {priorityLabel(priority)}
    </span>
  );
}

export function OverduePill() {
  return (
    <span className={`${PILL_BASE} text-urgent bg-urgent-soft`}>Overdue</span>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "urgent" | "positive";
}) {
  const cls =
    tone === "urgent"
      ? "text-urgent bg-urgent-soft"
      : tone === "positive"
        ? "text-low bg-low-soft"
        : "text-muted bg-surface-muted border border-line";
  return <span className={`${PILL_BASE} ${cls}`}>{label}</span>;
}

const URGENCY_ICONS: Record<Urgency, ReactNode> = {
  high: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" />
    </svg>
  ),
  medium: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" />
    </svg>
  ),
  low: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" />
    </svg>
  ),
};

const URGENCY_COPY: Record<
  Urgency,
  { title: string; note: string; wrap: string; ring: string }
> = {
  high: {
    title: "High urgency",
    note: "Needs attention now, overdue or at-risk items present.",
    wrap: "bg-urgent-soft border-[#f6c9cb]",
    ring: "bg-urgent text-white",
  },
  medium: {
    title: "Medium urgency",
    note: "Important tasks open, but none overdue yet.",
    wrap: "bg-high-soft border-[#f3d9ad]",
    ring: "bg-high text-white",
  },
  low: {
    title: "Low urgency",
    note: "On track, no pressing items.",
    wrap: "bg-low-soft border-[#b6e6dd]",
    ring: "bg-low text-white",
  },
};

export function UrgencyBanner({ urgency }: { urgency: Urgency }) {
  const c = URGENCY_COPY[urgency];
  return (
    <div
      className={`relative mt-1.5 flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 ${c.wrap}`}
    >
      <div
        className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full ${c.ring}`}
        aria-hidden
      >
        {URGENCY_ICONS[urgency]}
      </div>
      <div>
        <h4 className="font-display text-[14.5px]">{c.title}</h4>
        <p className="mt-0.5 text-xs text-muted">{c.note}</p>
      </div>
    </div>
  );
}
