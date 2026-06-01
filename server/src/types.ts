// Domain types — mirror the exact shape of the provided mock data.
// IDs and field names are never altered.
//
// The allowed values live in one place (the `as const` arrays below) and the
// union types are derived from them. Schemas and validators import the arrays,
// so there's a single source of truth for "what values are legal".

export const ENROLLMENT_STATUSES = ["active", "at_risk"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** The non-completed statuses — a task is "open" if its status is one of these. */
export const OPEN_TASK_STATUSES = ["todo", "in_progress"] as const;

export const TASK_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type Priority = (typeof TASK_PRIORITIES)[number];

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

/** A task enriched with a derived overdue flag for the client. */
export interface TaskWithMeta extends Task {
  isOverdue: boolean;
}

export interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

/** Aggregated payload returned by GET /students/:id/action-center. */
export interface ActionCenterResponse {
  student: Student;
  tasks: TaskWithMeta[];
  taskSummary: TaskSummary;
  unreadMessagesCount: number;
  messages: Message[];
  urgency: Urgency;
}

/** Compact per-student summary used by the roster/card grid. */
export interface StudentSummary {
  openTasks: number;
  unreadMessages: number;
  urgency: Urgency;
  nextTask: { title: string; dueDate: string; isOverdue: boolean } | null;
}

export interface StudentRosterEntry extends Student {
  summary: StudentSummary;
}
