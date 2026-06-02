import { useState } from "react";
import { useUpdateTaskStatus } from "../hooks/useUpdateTaskStatus";
import type { Task, TaskStatus, TaskSummary } from "../types";
import { TaskItem } from "./TaskItem";

type TaskFilter = "all" | "open" | "todo" | "in_progress" | "completed";

interface Props {
  studentId: string;
  tasks: Task[];
  summary: TaskSummary;
}

const FILTERS: { key: TaskFilter; label: string; count: (s: TaskSummary) => number }[] = [
  { key: "all", label: "All", count: (s) => s.total },
  { key: "open", label: "Open", count: (s) => s.todo + s.inProgress },
  { key: "todo", label: "To do", count: (s) => s.todo },
  { key: "in_progress", label: "In progress", count: (s) => s.inProgress },
  { key: "completed", label: "Completed", count: (s) => s.completed },
];

function matchesFilter(task: Task, filter: TaskFilter): boolean {
  if (filter === "all") return true;
  if (filter === "open") return task.status !== "completed";
  return task.status === filter;
}

export function TaskList({ studentId, tasks, summary }: Props) {
  // Local state — resets to "all" automatically every time a new student is opened.
  const [filter, setFilter] = useState<TaskFilter>("all");
  const mutation = useUpdateTaskStatus(studentId);

  const visible = tasks.filter((t) => matchesFilter(t, filter));

  const handleChange = (taskId: string, status: TaskStatus) =>
    mutation.mutate({ taskId, status });

  const savingId = mutation.isPending ? mutation.variables?.taskId : undefined;
  const errorId =
    mutation.isError && mutation.variables ? mutation.variables.taskId : undefined;

  return (
    <section
      className="animate-rise rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
      style={{ animationDelay: "140ms" }}
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-lg">Action items</h3>
          <div className="text-[13px] text-muted">
            {summary.todo + summary.inProgress} open · {summary.overdue} overdue ·{" "}
            {summary.completed} done
          </div>
        </div>
      </div>

      {/* Filters — horizontally scrollable on mobile */}
      <div
        className="-mx-1 my-4 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-slim sm:flex-wrap sm:overflow-visible"
        role="tablist"
        aria-label="Filter tasks"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={active}
              className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-muted hover:border-line-strong"
              }`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className={`ml-1 ${active ? "text-white/70" : "text-faint"}`}>
                {f.count(summary)}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="py-9 text-center text-[13px] text-faint">
          No tasks match this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onStatusChange={handleChange}
              isSaving={savingId === task.id}
              error={errorId === task.id ? "Couldn't save — try again" : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
