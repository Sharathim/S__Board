import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveLeave, rejectLeave } from "../../../api/leave";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { ExternalLink, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, Clock, FileText } from "lucide-react";

const TYPE_CONFIG = {
  CASUAL: { label:"Casual", badge:"bg-violet-100 text-violet-700 border-violet-200"},
  MEDICAL: { label:"Medical", badge:"bg-rose-100 text-rose-700 border-rose-200"},
  ON_DUTY: { label:"On Duty", badge:"bg-amber-100 text-amber-700 border-amber-200"},
  PERMISSION: { label:"Permission", badge:"bg-sky-100 text-sky-700 border-sky-200"},
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
  const typeCfg = TYPE_CONFIG[leave.leave_type] || TYPE_CONFIG.CASUAL;

  return (
    <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-xs hover:border-gray-300 transition-all">
      {/* Main row */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm shadow-primary-500/20">
          {(leave.faculty_name || "?").charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-extrabold text-gray-900 text-sm truncate">{leave.faculty_name}</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeCfg.badge}`}>
              {typeCfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {leave.start_date === leave.end_date ? leave.start_date : `${leave.start_date} → ${leave.end_date}`}
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
              className="shadow-xs"
            >
              {approveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setRejectMode(true)}
              disabled={isBusy}
              id={`reject-leave-${leave.id}`}
              className="shadow-xs"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((x) => !x)}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Reject comment bar */}
      {rejectMode && (
        <div className="px-4 py-3 bg-rose-50/80 border-t border-rose-100 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Rejection reason (optional)..."
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-xl text-xs border border-rose-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
            autoFocus
          />
          <Button size="sm" variant="danger" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
            {rejectMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Reject"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejectMode(false)}>Cancel</Button>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 py-3.5 border-t border-gray-100 bg-gray-50/50 space-y-2 text-xs">
          <div className="flex gap-2">
            <span className="w-24 text-gray-400 font-bold shrink-0">Reason</span>
            <span className="text-gray-800 font-medium leading-relaxed">{leave.reason}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-24 text-gray-400 font-bold shrink-0">Duration</span>
            <span className="text-gray-800">{leave.duration?.replace(/_/g,"")}</span>
          </div>
          {leave.period_numbers?.length > 0 && (
            <div className="flex gap-2">
              <span className="w-24 text-gray-400 font-bold shrink-0">Periods</span>
              <span className="text-primary-600 font-bold">{leave.period_numbers.join(",")}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="w-24 text-gray-400 font-bold shrink-0">Submitted</span>
            <span className="text-gray-600">{new Date(leave.created_at).toLocaleString()}</span>
          </div>

          {leave.document_url && (
            <div className="pt-2 border-t border-gray-200/60">
              <a
                href={leave.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-primary-600 bg-primary-50 border border-primary-100 hover:underline"
              >
                <FileText className="w-3.5 h-3.5" /> View Document <ExternalLink className="w-3 h-3" />
              </a>
            </div>
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
        <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse"/>
      ))}
    </div>
  );

  if (!leaves?.length) return (
    <div className="py-16 text-center rounded-2xl border border-dashed border-gray-200 bg-white">
      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3"/>
      <p className="text-gray-900 text-sm font-extrabold">All Clear!</p>
      <p className="text-xs text-gray-400 mt-1">No pending leave requests requiring review.</p>
    </div>
  );

  return (
    <div className="space-y-3 animate-fade-in">
      {leaves.map((l) => <ActionRow key={l.id} leave={l} />)}
    </div>
  );
}
