import { useNavigate } from "react-router-dom";
import { ErrorState } from "../components/States";
import { StudentsGrid } from "../components/StudentsGrid";
import { useStudents } from "../hooks/useStudents";

export function StudentsPage() {
  const studentsQuery = useStudents();
  const navigate = useNavigate();

  return (
    <main className="flex-1 overflow-y-auto px-4 py-5 scrollbar-slim sm:px-6 sm:py-7">
      {studentsQuery.isError ? (
        <ErrorState
          title="Couldn't load students"
          message="The roster failed to load. Check the API server and try again."
          onRetry={() => studentsQuery.refetch()}
        />
      ) : (
        <StudentsGrid
          students={studentsQuery.data ?? []}
          isLoading={studentsQuery.isLoading}
          onOpen={(id) => navigate(`/students/${id}`)}
          onMessage={(id) => navigate(`/students/${id}`, { state: { openChat: true } })}
        />
      )}
    </main>
  );
}
