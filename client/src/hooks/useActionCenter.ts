import { useQuery } from "@tanstack/react-query";
import { fetchActionCenter } from "../api/client";

export const actionCenterKey = (studentId: string) =>
  ["action-center", studentId] as const;

export function useActionCenter(studentId: string) {
  return useQuery({
    queryKey: actionCenterKey(studentId),
    queryFn: () => fetchActionCenter(studentId),
  });
}
