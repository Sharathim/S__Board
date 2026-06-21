import { Badge } from "../ui/Badge";

const variants = {
  IN_PROGRESS: "primary",
  LOW_ACTIVITY: "warning",
  COMPLETED: "success",
};

const labels = {
  IN_PROGRESS: "In Progress",
  LOW_ACTIVITY: "Low Activity",
  COMPLETED: "Completed",
};

export function StatusBadge({ status }) {
  return (
    <Badge variant={variants[status] || "default"}>
      {labels[status] || status}
    </Badge>
  );
}
