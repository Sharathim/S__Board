import { Badge } from "../ui/Badge";

const variants = {
  NOT_STARTED: "default",
  IN_PROGRESS: "primary",
  REVIEW: "warning",
  COMPLETED: "success",
  ON_HOLD: "warning",
  CANCELLED: "danger",
  LOW_ACTIVITY: "danger",
  // Leave request statuses
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  LEAVE_CANCELLED: "default",
};

const labels = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
  LOW_ACTIVITY: "Low Activity",
  // Leave request statuses
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  LEAVE_CANCELLED: "Cancelled",
};

export function StatusBadge({ status }) {
  return (
    <Badge variant={variants[status] || "default"}>
      {labels[status] || status}
    </Badge>
  );
}
