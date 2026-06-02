import { ENROLLMENT_LABELS, type Student, type Urgency } from "../types";
import { Avatar } from "./Avatar";
import { StatusPill, UrgencyBanner } from "./Badges";

interface Props {
  student: Student;
  urgency: Urgency;
}

export function StudentProfileSummary({ student, urgency }: Props) {
  return (
    <section
      className="relative animate-rise overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
      aria-label="Student profile"
    >
      {/* Decorative brand strip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[78px] bg-[linear-gradient(120deg,var(--color-brand-soft),#e7f7fb)]" />

      <div className="relative mb-5 flex items-center gap-4">
        <Avatar
          id={student.id}
          name={student.name}
          size={60}
          rounded="rounded-2xl"
          className="border-[3px] border-white shadow-card"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-xl tracking-tight">{student.name}</h2>
            <StatusPill
              label={ENROLLMENT_LABELS[student.enrollmentStatus]}
              tone={student.enrollmentStatus === "at_risk" ? "urgent" : "positive"}
            />
          </div>
          <div className="truncate text-[12.5px] text-muted">{student.email}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-line bg-surface-muted px-3.5 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
            Grade
          </div>
          <div className="mt-0.5 font-display text-xl font-bold text-ink">
            {student.grade}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface-muted px-3.5 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
            GPA
          </div>
          <div className="mt-0.5 font-display text-xl font-bold text-ink">
            {student.gpa.toFixed(1)}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface-muted px-3.5 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
            Counselor
          </div>
          <div className="mt-0.5 truncate font-display text-sm font-bold text-ink">
            {student.counselorId}
          </div>
        </div>
      </div>

      <UrgencyBanner urgency={urgency} />
    </section>
  );
}
