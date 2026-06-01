import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetData } from "../api/client";

/** Restores the demo database to the original mock data, then refreshes views. */
export function useResetData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
    },
  });
}
