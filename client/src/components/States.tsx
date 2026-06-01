interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="animate-rise mx-auto flex max-w-md flex-col items-center gap-2 rounded-card border border-line bg-surface p-10 text-center shadow-card sm:p-12"
      role="alert"
    >
      <div className="mb-2 grid h-[52px] w-[52px] place-items-center rounded-full bg-urgent-soft text-2xl text-urgent">
        !
      </div>
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      <button
        className="mt-3 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_var(--color-brand-ring)] transition hover:-translate-y-0.5 hover:bg-brand-strong"
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  );
}

/** Skeleton placeholder that mirrors the loaded layout. */
export function LoadingState() {
  return (
    <div
      className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Loading action center"
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center gap-4">
            <div className="skel h-16 w-16 rounded-2xl" />
            <div className="flex-1">
              <div className="skel h-5 w-[70%]" />
              <div className="skel mt-2 h-3 w-[50%]" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skel h-14" />
            ))}
          </div>
          <div className="skel mt-4 h-[72px]" />
        </div>
        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <div className="skel h-[18px] w-[40%]" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel mt-3.5 h-11" />
          ))}
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface p-6 shadow-card">
        <div className="skel h-[22px] w-[35%]" />
        <div className="skel mt-4 h-9 w-[80%]" />
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
