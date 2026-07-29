import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveLeave, rejectLeave } from "../../../api/leave";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { ExternalLink, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const TYPE_LABELS = {
  CASUAL: "Casual", MEDICAL: "Medical", ON_DUTY: "On Duty",
  PERMISSION: "Permission", COMP_OFF: "Comp-Off",
};

function ActionRow({ leave }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectMode, setRejectMode] = useState(false);

  const approveMut = useMutation({
    mutationFn: () => approveLeave(leave.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave"] }),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectLeave(leave.id, rejectComment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave"] }); setRejectMode(false); },
  });

  const isBusy = approveMut.isPending || rejectMut.isPending;

  return (
    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-white/20 transition-colors">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {(leave.faculty_name || "?").charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{leave.faculty_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{TYPE_LABELS[leave.leave_type]}</span>
            {" · "}
            {leave.start_date === leave.end_date ? leave.start_date : `${leave.start_date} – ${leave.end_date}`}
            {leave.days_count > 0 && ` · ${leave.days_count}d`}
          </p>
        </div>

        {/* Quick actions */}
        {!rejectMode && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="success"
              onClick={() => approveMut.mutate()}
              disabled={isBusy}
              id={`approve-leave-${leave.id}`}
            >
              {approveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setRejectMode(true)}
              disabled={isBusy}
              id={`reject-leave-${leave.id}`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </Button>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((x) => !x)}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Reject comment bar */}
      {rejectMode && (
        <div className="px-4 pb-3 bg-rose-50 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-900/30 flex items-center gap-2">
          <input
            type="text"
            placeholder="Rejection reason (optional)..."
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm border border-rose-200 dark:border-rose-800 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
            autoFocus
          />
          <Button size="sm" variant="danger" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
            {rejectMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejectMode(false)}>Cancel</Button>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02] space-y-2 text-sm">
          {[
            ["Reason", leave.reason],
            ["Duration", leave.duration?.replace(/_/g, " ")],
            ...(leave.period_numbers?.length ? [["Periods", leave.period_numbers.join(", ")]] : []),
            ["Submitted", new Date(leave.created_at).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="w-24 text-gray-400 shrink-0">{k}</span>
              <span className="text-gray-700 dark:text-gray-200">{v || "—"}</span>
            </div>
          ))}
          {leave.document_url && (
            <a
              href={leave.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1"
            >
              View Document <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function PendingApprovalTable({ leaves, isLoading }) {
  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
      ))}
    </div>
  );

  if (!leaves?.length) return (
    <div className="py-16 text-center">
      <CheckCircle2 className="w-12 h-12 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
      <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">No pending requests — all clear!</p>
    </div>
  );

  return (
    <div className="space-y-2.5">
      {leaves.map((l) => <ActionRow key={l.id} leave={l} />)}
    </div>
  );
}
