import { fromLean, type LeanDoc } from "../db/lean.js";
import { redis } from "../lib/redis.js";
import { MessageModel } from "../models/Message.js";
import { StudentModel } from "../models/Student.js";
import { TaskModel } from "../models/Task.js";
import {
  OPEN_TASK_STATUSES,
  type ActionCenterResponse,
  type Message,
  type Priority,
  type Student,
  type StudentRosterEntry,
  type Task,
  type TaskStatus,
  type TaskSummary,
  type TaskWithMeta,
  type Urgency,
} from "../types.js";

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const OPEN_STATUSES: readonly TaskStatus[] = OPEN_TASK_STATUSES;

function isTaskOverdue(task: Task, today: Date): boolean {
  if (task.status === "completed") return false;
  return new Date(`${task.dueDate}T23:59:59Z`).getTime() < today.getTime();
}

function deriveUrgency(
  enrollmentStatus: string,
  studentTasks: TaskWithMeta[],
): Urgency {
  const openTasks = studentTasks.filter((t) => OPEN_STATUSES.includes(t.status));

  // High: any open task that is both overdue and important — regardless of enrollment.
  const hasOverdueImportant = openTasks.some(
    (t) => t.isOverdue && (t.priority === "urgent" || t.priority === "high"),
  );
  if (hasOverdueImportant) return "high";

  // Medium: at-risk student with open important tasks, OR any open urgent/high task.
  const hasOpenImportant = openTasks.some(
    (t) => t.priority === "urgent" || t.priority === "high",
  );
  if (hasOpenImportant) return "medium";
  if (enrollmentStatus === "at_risk" && openTasks.length > 0) return "medium";

  // Low: all tasks done, or only low-priority open tasks remain.
  return "low";
}

function sortTasks(a: TaskWithMeta, b: TaskWithMeta): number {
  // 0 = open, 1 = completed → open tasks sort first.
  const aDone = OPEN_STATUSES.includes(a.status) ? 0 : 1;
  const bDone = OPEN_STATUSES.includes(b.status) ? 0 : 1;
  if (aDone !== bDone) return aDone - bDone;

  // then most urgent priority first,
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;

  // then earliest due date first.
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

function buildTaskSummary(studentTasks: TaskWithMeta[]): TaskSummary {
  return {
    total: studentTasks.length,
    todo: studentTasks.filter((t) => t.status === "todo").length,
    inProgress: studentTasks.filter((t) => t.status === "in_progress").length,
    completed: studentTasks.filter((t) => t.status === "completed").length,
    overdue: studentTasks.filter((t) => t.isOverdue).length,
  };
}

export async function getActionCenter(
  studentId: string,
  today: Date = new Date(),
): Promise<ActionCenterResponse | null> {
  const rawStudent = await StudentModel.findById(studentId).lean();
  if (!rawStudent) return null;

  const [rawTasks, rawMessages] = await Promise.all([
    TaskModel.find({ studentId }).lean(),
    MessageModel.find({ studentId }).lean(),
  ]);

  const student = fromLean<Student>(rawStudent as unknown as LeanDoc<Student>);

  const studentTasks: TaskWithMeta[] = (
    rawTasks as unknown as LeanDoc<Task>[]
  )
    .map((t) => {
      const task = fromLean<Task>(t);
      return { ...task, isOverdue: isTaskOverdue(task, today) };
    })
    .sort(sortTasks);

  const studentMessages: Message[] = (rawMessages as unknown as LeanDoc<Message>[])
    .map(fromLean<Message>)
    .sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );

  return {
    student,
    tasks: studentTasks,
    taskSummary: buildTaskSummary(studentTasks),
    unreadMessagesCount: studentMessages.filter((m) => !m.read).length,
    messages: studentMessages,
    urgency: deriveUrgency(student.enrollmentStatus, studentTasks),
  };
}

const ROSTER_CACHE_KEY = "roster";
const ROSTER_TTL_SECONDS = 60;

/**
 * Roster for the Students card grid: each student plus a compact summary
 * (open task count, unread messages, derived urgency, and the nearest deadline).
 * Result is cached in Redis for 60 s — subsequent requests are sub-millisecond.
 */
export async function getStudentRoster(
  today: Date = new Date(),
): Promise<StudentRosterEntry[]> {
  // Try the cache first. Gracefully degrade if Redis is unavailable.
  try {
    const cached = await redis.get(ROSTER_CACHE_KEY);
    if (cached) return JSON.parse(cached) as StudentRosterEntry[];
  } catch {
    // Redis miss or error — fall through to DB
  }

  const [rawStudents, rawTasks, rawMessages] = await Promise.all([
    StudentModel.find().sort({ name: 1 }).lean(),
    TaskModel.find().lean(),
    MessageModel.find().lean(),
  ]);

  const tasks = (rawTasks as unknown as LeanDoc<Task>[]).map(fromLean<Task>);
  const messages = (rawMessages as unknown as LeanDoc<Message>[]).map(fromLean<Message>);

  const roster = (rawStudents as unknown as LeanDoc<Student>[]).map((raw) => {
    const student = fromLean<Student>(raw);

    const studentTasks: TaskWithMeta[] = tasks
      .filter((t) => t.studentId === student.id)
      .map((t) => ({ ...t, isOverdue: isTaskOverdue(t, today) }));

    const openTasks = studentTasks
      .filter((t) => OPEN_STATUSES.includes(t.status))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const next = openTasks[0];

    return {
      ...student,
      summary: {
        openTasks: openTasks.length,
        unreadMessages: messages.filter(
          (m) => m.studentId === student.id && !m.read,
        ).length,
        urgency: deriveUrgency(student.enrollmentStatus, studentTasks),
        nextTask: next
          ? { title: next.title, dueDate: next.dueDate, isOverdue: next.isOverdue }
          : null,
      },
    };
  });

  // Cache the result. Fire-and-forget — a failure here should never break the response.
  redis.set(ROSTER_CACHE_KEY, JSON.stringify(roster), "EX", ROSTER_TTL_SECONDS).catch(() => {});

  return roster;
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  now: Date = new Date(),
): Promise<Task | null> {
  const updated = await TaskModel.findByIdAndUpdate(
    taskId,
    { status, updatedAt: now.toISOString() },
    { new: true, lean: true },
  );
  if (!updated) return null;

  const task = fromLean<Task>(updated as unknown as LeanDoc<Task>);

  // Invalidate the roster cache so the grid picks up the new task summary.
  redis.del(ROSTER_CACHE_KEY).catch(() => {});

  // Notify any browser tabs watching this student via SSE.
  redis
    .publish(`student:${task.studentId}`, JSON.stringify({ type: "task_updated", taskId }))
    .catch(() => {});

  return task;
}
