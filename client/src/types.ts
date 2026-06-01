// Domain types — mirror the API contract (server/src/types.ts).

export type EnrollmentStatus = "active" | "at_risk";
export type TaskStatus = "todo" | "in_progress" | "completed";
export type Priority = "urgent" | "high" | "medium" | "low";
export type Urgency = "high" | "medium" | "low";

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: number;
  gpa: number;
  counselorId: string;
  enrollmentStatus: EnrollmentStatus;
}

export interface Task {
  id: string;
  studentId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
}

export interface Message {
  id: string;
  studentId: string;
  from: string;
  subject: string;
  preview: string;
  read: boolean;
  receivedAt: string;
}

export interface StudentSummary {
  openTasks: number;
  unreadMessages: number;
  urgency: Urgency;
  nextTask: { title: string; dueDate: string; isOverdue: boolean } | null;
}

export interface StudentRosterEntry extends Student {
  summary: StudentSummary;
}

export interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface ActionCenterResponse {
  student: Student;
  tasks: Task[];
  taskSummary: TaskSummary;
  unreadMessagesCount: number;
  messages: Message[];
  urgency: Urgency;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Completed",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "completed"];

/** Human-readable labels for the enrollment status. */
export const ENROLLMENT_LABELS: Record<EnrollmentStatus, string> = {
  active: "Active",
  at_risk: "At risk",
};
