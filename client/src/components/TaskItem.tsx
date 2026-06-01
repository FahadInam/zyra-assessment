import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  type Priority,
  type Task,
  type TaskStatus,
} from "../types";
import { formatDate } from "../utils/format";
import { OverduePill, PriorityPill } from "./Badges";

interface Props {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  isSaving: boolean;
  error?: string;
}

const ACCENT: Record<Priority, string> = {
  urgent: "bg-urgent",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
};

export function TaskItem({ task, onStatusChange, isSaving, error }: Props) {
  const showOverdue = task.isOverdue && task.status !== "completed";
  const completed = task.status === "completed";

  return (
    <article
      className={`flex gap-3 rounded-2xl border border-line p-4 transition hover:border-line-strong hover:shadow-soft ${
        completed ? "opacity-60" : ""
      }`}
    >
      <span
        className={`w-1 flex-shrink-0 rounded-full ${ACCENT[task.priority]}`}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            <PriorityPill priority={task.priority} />
            {showOverdue && <OverduePill />}
          </div>
          <div
            className={`font-display text-[14.5px] font-semibold tracking-tight text-ink ${
              completed ? "text-faint line-through decoration-faint" : ""
            }`}
          >
            {task.title}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted">{task.description}</div>
          <div className="mt-2 flex items-center gap-2 text-[11.5px] text-faint">
            <span className={`font-semibold ${showOverdue ? "text-urgent" : ""}`}>
              Due {formatDate(task.dueDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
          <label className="sr-only" htmlFor={`status-${task.id}`}>
            Status for {task.title}
          </label>
          <select
            id={`status-${task.id}`}
            className="status-select cursor-pointer rounded-xl border border-line-strong bg-surface py-2.5 pl-3 pr-8 text-xs font-semibold text-body transition hover:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-ring disabled:cursor-progress disabled:opacity-60"
            value={task.status}
            disabled={isSaving}
            onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          >
            {TASK_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <span
            className={`h-3.5 text-right text-[10.5px] ${
              error
                ? "font-semibold text-urgent"
                : isSaving
                  ? "text-brand"
                  : "text-faint"
            }`}
          >
            {error ? error : isSaving ? "Saving…" : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
