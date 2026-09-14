import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelMyLeave } from "../../../api/leave";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { ExternalLink, X, FileText, CalendarDays, Clock, CheckCircle2 } from "lucide-react";

const TYPE_CONFIG = {
  CASUAL: { label:"Casual Leave", badge:"bg-violet-100 text-violet-700 border-violet-200"},
  MEDICAL: { label:"Medical Leave", badge:"bg-rose-100 text-rose-700 border-rose-200"},
  ON_DUTY: { label:"On Duty", badge:"bg-amber-100 text-amber-700 border-amber-200"},
  PERMISSION: { label:"Permission", badge:"bg-sky-100 text-sky-700 border-sky-200"},
};

const DUR_LABELS = {
  FULL_DAY: "Full Day",
  HALF_DAY_FIRST: "1st Half (Periods 1–2)",
  HALF_DAY_SECOND: "2nd Half (Periods 3–5)",
  PERMISSION_HOURS: "Specific Periods",
};

function DateRange({ start, end, duration }) {
  const same = start === end;
  return (
    <div>
      <p className="font-bold text-gray-900 text-xs sm:text-sm">
        {same ? start : `${start} → ${end}`}
      </p>
      <p className="text-[11px] text-gray-400 font-medium">
        {DUR_LABELS[duration] || duration}
      </p>
    </div>
  );
}

export function LeaveHistoryTable({ leaves, isLoading }) {
  const qc = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState(null);

  const cancelMut = useMutation({
    mutationFn: (id) => cancelMyLeave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      setCancelTarget(null);
    },
  });

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse"/>
      ))}
    </div>
  );

  if (!leaves?.length) return (
    <div className="py-16 text-center rounded-2xl border border-dashed border-gray-200 bg-white/50">
      <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3"/>
      <p className="text-gray-500 text-sm font-semibold">No leave requests found.</p>
      <p className="text-xs text-gray-400 mt-1">Your leave history will be listed here.</p>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP VIEW (Table) ── */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              {["Type", "Dates", "Days", "Reason", "Document", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaves.map((l) => {
              const canCancel = l.status === "PENDING" || l.status === "APPROVED";
              const badgeStatus = l.status === "CANCELLED" ? "LEAVE_CANCELLED" : l.status;
              const typeCfg = TYPE_CONFIG[l.leave_type] || TYPE_CONFIG.CASUAL;

              return (
                <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${typeCfg.badge}`}>
                      {typeCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <DateRange start={l.start_date} end={l.end_date} duration={l.duration} />
                    {l.period_numbers?.length > 0 && (
                      <p className="text-[11px] text-primary-600 font-semibold mt-0.5">
                        Periods: {l.period_numbers.join(", ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="font-extrabold text-gray-900 text-sm">
                      {l.days_count === 0 ? "0d" : `${l.days_count}d`}
                    </span>
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    <p className="text-gray-800 font-medium text-xs leading-relaxed line-clamp-2">
                      {l.reason}
                    </p>
                    {l.hod_comment && (
                      <p className="text-[11px] text-gray-400 mt-1 italic">
                        HOD Note: {l.hod_comment}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {l.document_url ? (
                      <a
                        href={l.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-primary-600 bg-primary-50 border border-primary-100 hover:underline"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={badgeStatus} />
                      {l.is_hod_initiated && (
                        <Badge variant="primary" className="text-[9px] font-bold">HOD</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    {canCancel && (
                      <button
                        onClick={() => setCancelTarget(l)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        title="Cancel this leave"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE VIEW (Card list for flawless responsive layout) ── */}
      <div className="block md:hidden space-y-3">
        {leaves.map((l) => {
          const canCancel = l.status === "PENDING" || l.status === "APPROVED";
          const badgeStatus = l.status === "CANCELLED" ? "LEAVE_CANCELLED" : l.status;
          const typeCfg = TYPE_CONFIG[l.leave_type] || TYPE_CONFIG.CASUAL;

          return (
            <div
              key={l.id}
              className="p-4 rounded-2xl border border-gray-200/80 bg-white shadow-xs space-y-3"
            >
              {/* Header: Type + Status + Cancel */}
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${typeCfg.badge}`}>
                  {typeCfg.label}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={badgeStatus} />
                  {l.is_hod_initiated && (
                    <Badge variant="primary" className="text-[9px] font-bold">HOD</Badge>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => setCancelTarget(l)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      title="Cancel this leave"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <DateRange start={l.start_date} end={l.end_date} duration={l.duration} />
                <span className="text-xs font-black text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                  {l.days_count === 0 ? "0d" : `${l.days_count}d`}
                </span>
              </div>

              {l.period_numbers?.length > 0 && (
                <p className="text-xs text-primary-600 font-semibold">
                  Periods: {l.period_numbers.join(", ")}
                </p>
              )}

              {/* Reason */}
              <div className="space-y-1">
                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                  {l.reason}
                </p>
                {l.hod_comment && (
                  <p className="text-[11px] text-gray-400 italic">
                    HOD Note: {l.hod_comment}
                  </p>
                )}
              </div>

              {/* Document link if present */}
              {l.document_url && (
                <div className="pt-2 border-t border-gray-100">
                  <a
                    href={l.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary-600 bg-primary-50 border border-primary-100"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Attachment Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMut.mutate(cancelTarget.id)}
        title="Cancel Leave Request"
        message={`Are you sure you want to cancel your ${TYPE_CONFIG[cancelTarget?.leave_type]?.label || cancelTarget?.leave_type} request for ${cancelTarget?.start_date}?${cancelTarget?.status === "APPROVED" ? " This will also restore the cancelled timetable entries." : ""}`}
        confirmText="Yes, Cancel Leave"
        danger
      />
    </>
  );
}
