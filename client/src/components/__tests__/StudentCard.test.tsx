import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { StudentRosterEntry } from "../../types";
import { StudentCard } from "../StudentCard";

const student: StudentRosterEntry = {
  id: "stu_001",
  name: "Maya Patel",
  email: "maya.patel@school.edu",
  grade: 11,
  gpa: 3.2,
  counselorId: "csl_001",
  enrollmentStatus: "at_risk",
  summary: {
    openTasks: 2,
    unreadMessages: 2,
    urgency: "high",
    nextTask: {
      title: "Submit FAFSA application",
      dueDate: "2026-06-05",
      isOverdue: false,
    },
  },
};

describe("StudentCard", () => {
  it("renders the student's key details", () => {
    render(<StudentCard student={student} onOpen={vi.fn()} onMessage={vi.fn()} />);

    expect(screen.getByText("Maya Patel")).toBeInTheDocument();
    expect(screen.getByText("maya.patel@school.edu")).toBeInTheDocument();
    expect(screen.getByText("At risk")).toBeInTheDocument();
    expect(screen.getByText(/open task/i)).toBeInTheDocument();
    expect(screen.getByText("Submit FAFSA application")).toBeInTheDocument();
  });

  it("opens the profile when the card is clicked", async () => {
    const onOpen = vi.fn();
    render(<StudentCard student={student} onOpen={onOpen} onMessage={vi.fn()} />);

    await userEvent.click(screen.getByText("Maya Patel"));

    expect(onOpen).toHaveBeenCalledWith("stu_001");
  });

  it("fires onMessage (and NOT onOpen) when the Message button is clicked", async () => {
    const onOpen = vi.fn();
    const onMessage = vi.fn();
    render(<StudentCard student={student} onOpen={onOpen} onMessage={onMessage} />);

    await userEvent.click(screen.getByRole("button", { name: /message/i }));

    expect(onMessage).toHaveBeenCalledWith("stu_001");
    // the button calls stopPropagation, so the card's onOpen must not fire
    expect(onOpen).not.toHaveBeenCalled();
  });
});
