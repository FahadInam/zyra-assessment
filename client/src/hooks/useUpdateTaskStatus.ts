import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchTaskStatus } from "../api/client";
import type { ActionCenterResponse, TaskStatus } from "../types";
import { actionCenterKey } from "./useActionCenter";

interface Vars {
  taskId: string;
  status: TaskStatus;
}

/**
 * Updates a task's status with an optimistic cache write.
 * On error the previous snapshot is restored; on settle the query is
 * invalidated so the server-derived summary/urgency stay authoritative.
 */
export function useUpdateTaskStatus(studentId: string) {
  const queryClient = useQueryClient();
  const key = actionCenterKey(studentId);

  return useMutation({
    mutationFn: ({ taskId, status }: Vars) => patchTaskStatus(taskId, status),

    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ActionCenterResponse>(key);

      if (previous) {
        queryClient.setQueryData<ActionCenterResponse>(key, {
          ...previous,
          tasks: previous.tasks.map((t) =>
            t.id === taskId ? { ...t, status } : t,
          ),
        });
      }

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      // Keep the Students grid summaries (open count, urgency, next due) fresh too.
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
