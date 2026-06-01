import type { StudentRosterEntry, Urgency } from "../types";
import { relativeDue } from "../utils/format";
import { Avatar } from "./Avatar";

interface Props {
  students: StudentRosterEntry[];
  onOpen: (id: string) => void;
}

const URGENCY_PILL: Record<Urgency, string> = {
  high: "bg-urgent-soft text-urgent",
  medium: "bg-high-soft text-high-ink",
  low: "bg-low-soft text-low",
};

export function StudentsTable({ students, onOpen }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <div className="overflow-x-auto scrollbar-slim">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-faint">
              <th className="px-5 py-3 font-semibold">Student</th>
              <th className="px-3 py-3 font-semibold">Grade</th>
              <th className="px-3 py-3 font-semibold">GPA</th>
              <th className="px-3 py-3 font-semibold">Open</th>
              <th className="px-3 py-3 font-semibold">Urgency</th>
              <th className="px-3 py-3 font-semibold">Next due</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const due = s.summary.nextTask ? relativeDue(s.summary.nextTask.dueDate) : null;
              return (
                <tr
                  key={s.id}
                  onClick={() => onOpen(s.id)}
                  className="group cursor-pointer border-b border-line last:border-0 transition hover:bg-surface-muted"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar id={s.id} name={s.name} size={36} />
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-ink">{s.name}</div>
                        <div className="truncate text-[11.5px] text-faint">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-body">{s.grade}</td>
                  <td className="px-3 py-3 text-[13px] text-body">{s.gpa.toFixed(1)}</td>
                  <td className="px-3 py-3 text-[13px] text-body">{s.summary.openTasks}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${URGENCY_PILL[s.summary.urgency]}`}>
                      {s.summary.urgency}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12.5px]">
                    {due ? (
                      <span className={due.overdue ? "font-semibold text-urgent" : "text-muted"}>
                        {due.label}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-brand opacity-0 transition group-hover:opacity-100">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 10h10M11 6l4 4-4 4" />
                      </svg>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
