import type { Message } from "../types";
import { timeAgo } from "../utils/format";

interface Props {
  messages: Message[];
  unreadCount: number;
  onMessageClick: (message: Message) => void;
}

export function UnreadMessages({ messages, unreadCount, onMessageClick }: Props) {
  return (
    <section
      className="animate-rise rounded-card border border-line bg-surface p-5 shadow-card"
      style={{ animationDelay: "80ms" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px]">Messages</h3>
        {unreadCount > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-brand py-1 pl-2 pr-3 text-[13px] font-bold text-white shadow-[0_4px_14px_-4px_var(--color-brand-ring)]"
            aria-label={`${unreadCount} unread messages`}
          >
            <span className="min-w-5 rounded-full bg-white/25 px-1.5 text-center">
              {unreadCount}
            </span>
            unread
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="py-9 text-center text-[13px] text-faint">No messages.</div>
      ) : (
        <div className="flex flex-col">
          {messages.map((m, i) => (
            <button
              key={m.id}
              className={`group flex items-start gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-surface-muted ${
                i > 0 ? "border-t border-line" : ""
              }`}
              onClick={() => onMessageClick(m)}
              aria-label={`Open message: ${m.subject}`}
            >
              <span
                className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                  m.read
                    ? "bg-line-strong"
                    : "bg-brand ring-4 ring-brand-soft"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2.5 text-[13px] font-semibold text-ink">
                  <span className="truncate">{m.from}</span>
                  <span className="flex-shrink-0 text-[11px] font-medium text-faint">
                    {timeAgo(m.receivedAt)}
                  </span>
                </div>
                <div
                  className={`mt-px truncate text-[13px] text-body ${
                    m.read ? "" : "font-semibold"
                  }`}
                >
                  {m.subject}
                </div>
                <div className="mt-0.5 truncate text-xs text-faint">{m.preview}</div>
              </div>
              <span
                className="mt-0.5 flex-shrink-0 text-lg leading-none text-faint transition group-hover:translate-x-0.5 group-hover:text-brand"
                aria-hidden
              >
                ›
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
