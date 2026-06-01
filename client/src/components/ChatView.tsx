import { useState } from "react";
import type { Message } from "../types";
import { avatarGradient, formatDate, initials, timeAgo } from "../utils/format";
import { StatusPill } from "./Badges";

interface Props {
  messages: Message[];
  initialMessage: Message;
  studentName: string;
  onClose: () => void;
}

const YouAvatar = ({ size = "h-8 w-8" }: { size?: string }) => (
  <div
    className={`grid ${size} flex-shrink-0 place-items-center rounded-[9px] border border-line bg-surface-muted text-faint`}
    aria-hidden
  >
    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
    </svg>
  </div>
);

export function ChatView({ messages, initialMessage, studentName, onClose }: Props) {
  const [active, setActive] = useState<Message>(initialMessage);
  // Mobile two-level nav: 'conversation' shown first (user tapped a message).
  const [mobilePane, setMobilePane] = useState<"list" | "conversation">("conversation");

  return (
    <div className="animate-chat-in flex h-full bg-surface">
      {/* ── Thread list ─────────────────────────────────────── */}
      <aside
        className={`w-full flex-shrink-0 flex-col overflow-hidden border-r border-line bg-surface md:flex md:w-[300px] ${
          mobilePane === "conversation" ? "hidden" : "flex"
        }`}
      >
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-line px-4 pb-3 pt-4">
          <button
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface-muted py-1.5 pl-2.5 pr-3 text-[12.5px] font-semibold text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand-strong"
            onClick={onClose}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <path d="M12 4l-6 6 6 6" />
            </svg>
            Back
          </button>
          <span className="font-display text-sm font-bold tracking-tight">Messages</span>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 scrollbar-slim">
          {messages.map((m) => {
            const isActive = m.id === active.id;
            return (
              <button
                key={m.id}
                className={`flex w-full items-start gap-2.5 rounded-2xl border p-2.5 text-left transition ${
                  isActive
                    ? "border-brand bg-brand-soft"
                    : "border-transparent hover:bg-surface-muted"
                }`}
                onClick={() => {
                  setActive(m);
                  setMobilePane("conversation");
                }}
                aria-pressed={isActive}
              >
                <div
                  className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] font-display text-xs font-bold text-white"
                  style={{ background: avatarGradient(m.from) }}
                  aria-hidden
                >
                  {initials(m.from)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-baseline justify-between gap-1">
                    <span
                      className={`truncate text-[12.5px] font-bold ${isActive ? "text-brand-strong" : "text-ink"}`}
                    >
                      {m.from}
                    </span>
                    <span className="flex-shrink-0 text-[10.5px] text-faint">
                      {timeAgo(m.receivedAt)}
                    </span>
                  </div>
                  <div
                    className={`mb-0.5 truncate text-xs font-semibold ${isActive ? "text-brand-strong" : "text-ink"}`}
                  >
                    {m.subject}
                  </div>
                  <div className="truncate text-[11.5px] text-faint">{m.preview}</div>
                </div>
                {!m.read && (
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand ring-[3px] ring-brand-soft" aria-label="Unread" />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Conversation ────────────────────────────────────── */}
      <div
        className={`min-w-0 flex-1 flex-col bg-bg md:flex ${
          mobilePane === "list" ? "hidden" : "flex"
        }`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3 md:px-5">
          <button
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-line bg-surface-muted text-muted transition hover:bg-brand-soft md:hidden"
            onClick={() => setMobilePane("list")}
            aria-label="Back to message list"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <path d="M12 4l-6 6 6 6" />
            </svg>
          </button>
          <div
            className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-[13px] font-display text-[15px] font-bold text-white"
            style={{ background: avatarGradient(active.from) }}
            aria-hidden
          >
            {initials(active.from)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold tracking-tight text-ink">
              {active.from}
            </p>
            <p className="truncate text-[12.5px] text-muted">{active.subject}</p>
          </div>
          {!active.read && <StatusPill label="Unread" tone="urgent" />}
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 scrollbar-slim md:px-7">
          <div className="self-center rounded-full border border-line bg-surface-muted px-4 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
            {formatDate(active.receivedAt)}
          </div>

          {/* Received bubble */}
          <div className="flex items-end gap-2.5">
            <div
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] font-display text-xs font-bold text-white"
              style={{ background: avatarGradient(active.from) }}
              aria-hidden
            >
              {initials(active.from)}
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3 shadow-soft sm:max-w-[70%]">
              <p className="text-[13.5px] text-body">{active.preview}</p>
              <span className="mt-1.5 block text-[10.5px] text-faint">
                {timeAgo(active.receivedAt)}
              </span>
            </div>
          </div>

          {/* Counselor placeholder */}
          <div className="flex items-end justify-end gap-2.5">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-dashed border-line-strong bg-surface-muted px-4 py-3 sm:max-w-[70%]">
              <p className="text-[13.5px] italic text-faint">
                Regarding <strong className="font-bold not-italic text-body">{studentName}</strong> — no reply sent yet.
              </p>
            </div>
            <YouAvatar />
          </div>
        </div>

        {/* Disabled input */}
        <div className="flex-shrink-0 border-t border-line bg-surface px-4 py-3.5 md:px-5">
          <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface-muted py-1.5 pl-3 pr-2">
            <YouAvatar size="h-7 w-7" />
            <input
              type="text"
              className="flex-1 cursor-not-allowed border-0 bg-transparent py-1 text-[13.5px] text-faint outline-none placeholder:text-faint"
              placeholder="Replies are disabled in read-only view…"
              disabled
              aria-label="Reply disabled"
            />
            <button
              className="grid h-9 w-9 flex-shrink-0 cursor-not-allowed place-items-center rounded-full bg-line text-faint"
              disabled
              aria-label="Send reply"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] text-faint">
            <svg viewBox="0 0 20 20" fill="currentColor" width="11" height="11">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
            </svg>
            Read-only · replies are disabled
          </p>
        </div>
      </div>
    </div>
  );
}
