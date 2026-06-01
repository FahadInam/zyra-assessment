import type {
  ActionCenterResponse,
  StudentRosterEntry,
  Task,
  TaskStatus,
} from "../types";

// In dev, Vite proxies these paths to the Express server (see vite.config.ts).
// Override with VITE_API_BASE_URL for other environments.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      body?.error ?? "UNKNOWN",
      body?.message ?? `Request failed with status ${res.status}.`,
    );
  }

  return res.json() as Promise<T>;
}

export function fetchStudents(): Promise<StudentRosterEntry[]> {
  return request<StudentRosterEntry[]>("/students");
}

export function fetchActionCenter(studentId: string): Promise<ActionCenterResponse> {
  return request<ActionCenterResponse>(
    `/students/${encodeURIComponent(studentId)}/action-center`,
  );
}

export function resetData(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/reset", { method: "POST" });
}

export function patchTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  return request<Task>(`/tasks/${encodeURIComponent(taskId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
