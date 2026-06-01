import { Link, useMatch, useResolvedPath } from "react-router-dom";
import { useStudents } from "../hooks/useStudents";

const Chevron = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-faint">
    <path d="M8 5l5 5-5 5" />
  </svg>
);

function LogsLink() {
  const resolved = useResolvedPath("/logs");
  const isLogs = useMatch({ path: resolved.pathname });
  return (
    <Link
      to="/logs"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition ${
        isLogs
          ? "border-brand bg-brand-soft text-brand-strong"
          : "border-line bg-surface-muted text-muted hover:border-brand hover:text-brand"
      }`}
      title="View request logs"
    >
      <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M4 5h12M4 10h12M4 15h7" />
      </svg>
      <span className="hidden sm:inline">Logs</span>
    </Link>
  );
}

/** Route-aware top bar: brand + breadcrumb + (on detail) a mobile back button. */
export function Topbar() {
  const detail = useMatch("/students/:studentId");
  const studentId = detail?.params.studentId;

  const studentsQuery = useStudents();
  const activeName =
    studentsQuery.data?.find((s) => s.id === studentId)?.name ?? "";

  return (
    <header className="z-10 flex h-[60px] flex-shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {studentId && (
          <Link
            to="/"
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-line bg-surface-muted text-muted transition hover:bg-brand-soft md:hidden"
            aria-label="Back to students"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M12 4l-6 6 6 6" />
            </svg>
          </Link>
        )}

        <Link to="/" className="flex flex-shrink-0 items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#2c46e0,#6a7bff)] font-display text-lg font-extrabold text-white shadow-card">
            Z
          </div>
          <strong className="font-display text-base tracking-tight text-ink">Zyra</strong>
        </Link>

        {/* Breadcrumb */}
        <nav className="ml-1 hidden min-w-0 items-center gap-1.5 text-[13px] sm:flex" aria-label="Breadcrumb">
          <Chevron />
          <span className="text-faint">Counselor</span>
          <Chevron />
          {studentId ? (
            <Link to="/" className="font-medium text-muted transition hover:text-brand">
              Students
            </Link>
          ) : (
            <span className="font-semibold text-ink">Students</span>
          )}
          {studentId && (
            <>
              <Chevron />
              <span className="truncate font-semibold text-brand">{activeName}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <LogsLink />
        <div className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 py-1.5 text-[12.5px] font-semibold text-muted">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          <span className="hidden sm:inline">Counselor</span>
        </div>
      </div>
    </header>
  );
}
