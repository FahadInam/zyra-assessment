import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { ChatView } from "../components/ChatView";
import { ErrorState, LoadingState } from "../components/States";
import { StudentProfileSummary } from "../components/StudentProfileSummary";
import { TaskList } from "../components/TaskList";
import { UnreadMessages } from "../components/UnreadMessages";
import { useActionCenter } from "../hooks/useActionCenter";
import { useUiStore } from "../store/uiStore";
import type { Message } from "../types";

export function StudentDetailPage() {
  const { studentId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const setTaskFilter = useUiStore((s) => s.setTaskFilter);

  // Only mounts on this route, so the action-center query never runs on the grid.
  const query = useActionCenter(studentId);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const openedChatRef = useRef(false);

  // Reset transient state whenever the student in the URL changes.
  useEffect(() => {
    setTaskFilter("all");
    setSelectedMessage(null);
    openedChatRef.current = false;
  }, [studentId, setTaskFilter]);

  // Arrived via a card's "Message" button → open the newest message once, then
  // clear the navigation flag so a refetch doesn't reopen it.
  useEffect(() => {
    const wantChat = (location.state as { openChat?: boolean } | null)?.openChat;
    if (wantChat && query.data && !openedChatRef.current) {
      openedChatRef.current = true;
      setSelectedMessage(query.data.messages[0] ?? null);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, query.data, navigate]);

  // Chat is a full-bleed, immersive pane.
  if (selectedMessage && query.data) {
    return (
      <main className="min-h-0 flex-1 overflow-hidden">
        <ChatView
          messages={query.data.messages}
          initialMessage={selectedMessage}
          studentName={query.data.student.name}
          onClose={() => setSelectedMessage(null)}
        />
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto scrollbar-slim">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-brand"
        >
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4l-6 6 6 6" />
          </svg>
          All students
        </Link>

        {query.isLoading && <LoadingState />}

        {query.isError && (
          <ErrorState
            title={
              query.error instanceof ApiError && query.error.status === 404
                ? "Student not found"
                : "Couldn't load the action center"
            }
            message={
              query.error instanceof ApiError
                ? query.error.message
                : "An unexpected error occurred."
            }
            onRetry={() => query.refetch()}
          />
        )}

        {query.data && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              <StudentProfileSummary
                student={query.data.student}
                urgency={query.data.urgency}
              />
              <UnreadMessages
                messages={query.data.messages}
                unreadCount={query.data.unreadMessagesCount}
                onMessageClick={setSelectedMessage}
              />
            </div>
            <TaskList
              studentId={studentId}
              tasks={query.data.tasks}
              summary={query.data.taskSummary}
            />
          </div>
        )}
      </div>
    </main>
  );
}
