import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LogsPage } from "./pages/LogsPage";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { StudentsPage } from "./pages/StudentsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<StudentsPage />} />
        <Route path="/students/:studentId" element={<StudentDetailPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
