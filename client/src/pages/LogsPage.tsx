import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type LogEntry, fetchLogs } from "../api/client";

// pino numeric levels → human labels and colours
const LEVEL_MAP: Record<number, { label: string; classes: string }> = {
  10: { label: "TRACE", classes: "bg-surface-muted text-faint" },
  20: { label: "DEBUG", classes: "bg-medium-soft text-medium" },
  30: { label: "INFO",  classes: "bg-low-soft text-low" },
  40: { label: "WARN",  classes: "bg-high-soft text-high-ink" },
  50: { label: "ERROR", classes: "bg-urgent-soft text-urgent" },
  60: { label: "FATAL", classes: "bg-urgent text-white" },
};

function levelInfo(n: number) {
  return LEVEL_MAP[n] ?? { label: String(n), classes: "bg-surface-muted text-faint" };
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false);
  const { label, classes } = levelInfo(entry.level);

  const isRequest = !!entry.req;
  const statusCode = entry.res?.statusCode;
  const isError = entry.level >= 50;

  const rowBg = isError
    ? "bg-urgent-soft"
    : statusCode && statusCode >= 400
    ? "bg-high-soft"
    : "";

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-line transition hover:bg-surface-muted ${rowBg}`}
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-2.5 font-mono text-xs text-faint whitespace-nowrap">
          {formatTime(entry.time)}
        </td>
        <td className="px-3 py-2.5">
          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${classes}`}>
            {label}
          </span>
        </td>
        <td className="px-3 py-2.5">
          {isRequest && entry.req && (
            <span className="mr-2 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-muted">
              {entry.req.method}
            </span>
          )}
          <span className="text-[13px] text-body">{entry.msg}</span>
          {entry.req?.url && (
            <span className="ml-2 text-xs text-faint">{entry.req.url}</span>
          )}
          {entry.err?.message && (
            <span className="ml-2 text-xs text-urgent">{entry.err.message}</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-center">
          {statusCode && (
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${
                statusCode >= 500
                  ? "bg-urgent-soft text-urgent"
                  : statusCode >= 400
                  ? "bg-high-soft text-high-ink"
                  : "bg-low-soft text-low"
              }`}
            >
              {statusCode}
            </span>
          )}
        </td>
        <td className="px-3 py-2.5 font-mono text-xs text-faint whitespace-nowrap">
          {entry.responseTime != null ? `${entry.responseTime}ms` : ""}
        </td>
        <td className="px-3 py-2.5 font-mono text-[10.5px] text-faint">
          {entry.reqId ? entry.reqId.slice(0, 8) + "…" : ""}
        </td>
        <td className="px-3 py-2.5 text-faint">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M5 8l5 5 5-5" />
          </svg>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-line bg-surface-muted">
          <td colSpan={7} className="px-4 py-3">
            <pre className="scrollbar-slim max-h-64 overflow-auto rounded-xl bg-ink p-4 text-[11.5px] leading-relaxed text-white">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export function LogsPage() {
  const [limit, setLimit] = useState(100);
  const [filterLevel, setFilterLevel] = useState<number | "all">("all");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["logs", limit],
    queryFn: () => fetchLogs(limit),
    refetchInterval: 5000, // auto-refresh every 5s
  });

  const entries = (data?.entries ?? []).filter(
    (e) => filterLevel === "all" || e.level === filterLevel,
  );

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 scrollbar-slim sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl tracking-tight">Request Logs</h1>
            <p className="text-[13px] text-muted">
              Live view of <code className="rounded bg-surface-muted px-1 py-0.5 text-[12px]">server/logs/app.log</code>
              {" "}· auto-refreshes every 5s
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Level filter */}
            <select
              className="rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-body"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value === "all" ? "all" : Number(e.target.value))}
            >
              <option value="all">All levels</option>
              <option value={30}>INFO</option>
              <option value={40}>WARN</option>
              <option value={50}>ERROR</option>
              <option value={20}>DEBUG</option>
            </select>

            {/* Limit */}
            <select
              className="rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-body"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
            </select>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] font-semibold text-muted transition hover:border-brand hover:text-brand disabled:opacity-60"
            >
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                className={isFetching ? "animate-spin" : ""}>
                <path d="M15.5 8a5.5 5.5 0 1 0 .9 4" /><path d="M16 3v4h-4" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Summary counts */}
        {data && (
          <div className="mb-4 flex flex-wrap gap-3">
            {[
              { level: 30, label: "Info" },
              { level: 40, label: "Warn" },
              { level: 50, label: "Error" },
            ].map(({ level, label }) => {
              const count = data.entries.filter((e) => e.level === level).length;
              const { classes } = levelInfo(level);
              return (
                <button
                  key={level}
                  onClick={() => setFilterLevel(filterLevel === level ? "all" : level)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    filterLevel === level ? classes + " border-transparent" : "border-line bg-surface text-muted"
                  }`}
                >
                  {label} · {count}
                </button>
              );
            })}
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-faint">
              Total · {data.total}
            </span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
          {isLoading && (
            <div className="py-16 text-center text-[13px] text-faint">Loading logs…</div>
          )}
          {isError && (
            <div className="py-16 text-center text-[13px] text-urgent">
              Could not load logs — is the server running?
            </div>
          )}
          {data?.message && entries.length === 0 && (
            <div className="py-16 text-center text-[13px] text-faint">{data.message}</div>
          )}
          {entries.length > 0 && (
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wider text-faint">
                    <th className="px-4 py-2.5 font-semibold">Time</th>
                    <th className="px-3 py-2.5 font-semibold">Level</th>
                    <th className="px-3 py-2.5 font-semibold">Message</th>
                    <th className="px-3 py-2.5 font-semibold text-center">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Duration</th>
                    <th className="px-3 py-2.5 font-semibold">Request ID</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <LogRow key={i} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
