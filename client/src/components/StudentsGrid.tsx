import { useMemo, useState } from "react";
import { useResetData } from "../hooks/useResetData";
import { useUiStore } from "../store/uiStore";
import type { StudentRosterEntry, Urgency } from "../types";
import { StudentCard } from "./StudentCard";
import { StudentsTable } from "./StudentsTable";

interface Props {
  students: StudentRosterEntry[];
  isLoading: boolean;
  onOpen: (id: string) => void;
  onMessage: (id: string) => void;
}

type SortKey = "name" | "grade" | "gpa" | "urgency";
const URGENCY_RANK: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "grade", label: "Grade" },
  { key: "gpa", label: "GPA" },
  { key: "urgency", label: "Urgency" },
];

export function StudentsGrid({ students, isLoading, onOpen, onMessage }: Props) {
  const [query, setQuery] = useState("");
  const mode = useUiStore((s) => s.gridMode);
  const setMode = useUiStore((s) => s.setGridMode);
  const sort = useUiStore((s) => s.gridSort) as SortKey;
  const setSort = useUiStore((s) => s.setGridSort);
  const reset = useResetData();

  const handleReset = () => {
    if (window.confirm("Reset all data back to the original mock data?")) {
      reset.mutate();
    }
  };

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            String(s.grade).includes(q),
        )
      : students;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "grade":
          return b.grade - a.grade;
        case "gpa":
          return b.gpa - a.gpa;
        case "urgency":
          return URGENCY_RANK[a.summary.urgency] - URGENCY_RANK[b.summary.urgency];
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [students, query, sort]);

  return (
    <div className="animate-rise">
      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Cards / Table toggle */}
          <div className="inline-flex rounded-xl border border-line bg-surface p-1">
            {(["cards", "table"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold capitalize transition ${
                  mode === m ? "bg-brand text-white shadow-soft" : "text-muted hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="text-[13px] text-faint">
            {visible.length} student{visible.length === 1 ? "" : "s"}
          </span>

          <button
            onClick={handleReset}
            disabled={reset.isPending}
            title="Restore the original mock data"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-60"
          >
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              className={reset.isPending ? "animate-spin" : ""}>
              <path d="M15.5 8a5.5 5.5 0 1 0 .9 4" /><path d="M16 3v4h-4" />
            </svg>
            {reset.isPending ? "Resetting…" : "Reset data"}
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-faint"
              viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="8.5" cy="8.5" r="5.5" /><path d="M15 15l-3-3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students…"
              aria-label="Search students"
              className="w-44 rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-[13px] text-body transition placeholder:text-faint focus:w-56 focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand-ring"
            />
          </div>

          {/* Sort chips */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  sort === s.key
                    ? "border-brand bg-brand-soft text-brand-strong"
                    : "border-line bg-surface text-muted hover:border-line-strong"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="skel h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <div className="skel h-3.5 w-2/3" />
                  <div className="skel mt-2 h-2.5 w-1/2" />
                </div>
              </div>
              <div className="skel mt-4 h-3 w-3/4" />
              <div className="skel mt-4 h-14 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface py-16 text-center text-[14px] text-faint">
          No students match “{query}”.
        </div>
      ) : mode === "cards" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <StudentCard key={s.id} student={s} onOpen={onOpen} onMessage={onMessage} />
          ))}
        </div>
      ) : (
        <StudentsTable students={visible} onOpen={onOpen} />
      )}
    </div>
  );
}
