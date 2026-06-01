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

const URGENCY_COPY: Record<
  Urgency,
  { title: string; icon: string; note: string; wrap: string; ring: string }
> = {
  high: {
    title: "High urgency",
    icon: "▲",
    note: "Needs attention now — overdue or at-risk items present.",
    wrap: "bg-urgent-soft border-[#f6c9cb]",
    ring: "bg-urgent text-white",
  },
  medium: {
    title: "Medium urgency",
    icon: "●",
    note: "Important tasks open, but none overdue yet.",
    wrap: "bg-high-soft border-[#f3d9ad]",
    ring: "bg-high text-white",
  },
  low: {
    title: "Low urgency",
    icon: "✓",
    note: "On track — no pressing items.",
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
        className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[17px] ${c.ring}`}
        aria-hidden
      >
        {c.icon}
      </div>
      <div>
        <h4 className="font-display text-[14.5px]">{c.title}</h4>
        <p className="mt-0.5 text-xs text-muted">{c.note}</p>
      </div>
    </div>
  );
}
