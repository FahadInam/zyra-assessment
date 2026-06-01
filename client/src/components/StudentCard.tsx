import { ENROLLMENT_LABELS, type StudentRosterEntry, type Urgency } from "../types";
import { relativeDue } from "../utils/format";
import { Avatar } from "./Avatar";

interface Props {
  student: StudentRosterEntry;
  onOpen: (id: string) => void;
  onMessage: (id: string) => void;
}

const ACCENT: Record<Urgency, string> = {
  high: "bg-[linear-gradient(90deg,#e5484d,#f5888b)]",
  medium: "bg-[linear-gradient(90deg,#ef8a17,#f6b65a)]",
  low: "bg-[linear-gradient(90deg,#3a5bff,#8aa0ff)]",
};

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
      <span className="text-faint">{icon}</span>
      {children}
    </span>
  );
}

export function StudentCard({ student, onOpen, onMessage }: Props) {
  const { summary } = student;
  const due = summary.nextTask ? relativeDue(summary.nextTask.dueDate) : null;

  return (
    <article
      onClick={() => onOpen(student.id)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card"
    >
      <div className={`h-1 w-full ${ACCENT[summary.urgency]}`} aria-hidden />

      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar id={student.id} name={student.name} size={48} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">
              {student.name}
            </h3>
            <p className="truncate text-xs text-faint">{student.email}</p>
          </div>
          <span
            title="Enrollment status (not derived from tasks)"
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
              student.enrollmentStatus === "at_risk"
                ? "bg-urgent-soft text-urgent"
                : "bg-low-soft text-low"
            }`}
          >
            {ENROLLMENT_LABELS[student.enrollmentStatus]}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Meta
            icon={
              <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                <path d="M10 2 1 6l9 4 7-3.1V12h2V6l-9-4Zm-6 8.2V13c0 1.7 2.7 3 6 3s6-1.3 6-3v-2.8l-6 2.6-6-2.6Z" />
              </svg>
            }
          >
            {ordinal(student.grade)} Grade
          </Meta>
          <Meta
            icon={
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 3h9l3 3v11H4V3Z" /><path d="M12 3v4h4" />
              </svg>
            }
          >
            GPA {student.gpa.toFixed(1)}
          </Meta>
          <Meta
            icon={
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M7 4h9M7 10h9M7 16h9" strokeLinecap="round" /><path d="M3 4h.01M3 10h.01M3 16h.01" strokeLinecap="round" />
              </svg>
            }
          >
            {summary.openTasks} open task{summary.openTasks === 1 ? "" : "s"}
          </Meta>
        </div>

        {/* Deadline box */}
        <div className="mt-4 rounded-xl border border-line bg-surface-muted p-3">
          {summary.nextTask && due ? (
            <>
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7"
                  className={due.overdue ? "text-urgent" : "text-brand"}>
                  <circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" strokeLinecap="round" />
                </svg>
                <span className={`text-[12.5px] font-bold ${due.overdue ? "text-urgent" : "text-ink"}`}>
                  {due.label}
                </span>
              </div>
              <p className="mt-0.5 truncate pl-[19px] text-xs text-faint">
                {summary.nextTask.title}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-low">
              <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                <path d="M8.5 13.6 4.9 10l-1.4 1.4 5 5 9-9L16.1 6 8.5 13.6Z" />
              </svg>
              All tasks complete
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessage(student.id);
            }}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-brand"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 5h14v9H8l-4 3v-3H3V5Z" strokeLinejoin="round" />
            </svg>
            Message
            {summary.unreadMessages > 0 && (
              <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {summary.unreadMessages}
              </span>
            )}
          </button>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand transition group-hover:gap-1.5">
            View profile
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 10h10M11 6l4 4-4 4" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
}
