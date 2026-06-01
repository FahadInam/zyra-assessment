import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { actionCenterKey } from "./useActionCenter";

/**
 * Opens a Server-Sent Events connection to GET /events/:studentId.
 * When the server publishes a task_updated event for this student,
 * React Query's cache for that student is invalidated so the UI
 * refreshes automatically without a manual reload.
 *
 * The connection is opened when the component mounts and closed when
 * it unmounts (i.e. when the counselor navigates away from the page).
 */
export function useSSE(studentId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource(`/events/${studentId}`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string };
        if (data.type === "task_updated") {
          queryClient.invalidateQueries({ queryKey: actionCenterKey(studentId) });
          queryClient.invalidateQueries({ queryKey: ["students"] });
        }
      } catch {
        // malformed event — ignore
      }
    };

    es.onerror = () => {
      // Browser will automatically reconnect on error — no action needed
    };

    return () => es.close();
  }, [studentId, queryClient]);
}
