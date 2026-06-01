import { useQuery } from "@tanstack/react-query";
import { fetchStudents } from "../api/client";

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    staleTime: 5 * 60_000, // roster doesn't change often
  });
}
