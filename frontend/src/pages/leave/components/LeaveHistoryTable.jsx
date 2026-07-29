import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelMyLeave } from "../../../api/leave";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Badge } from "../../../components/ui/Badge";
import { ExternalLink, X } from "lucide-react";

const TYPE_LABELS = {
  CASUAL: "Casual", MEDICAL: "Medical", ON_DUTY: "On Duty",
  PERMISSION: "Permission", COMP_OFF: "Comp-Off",
};
const DUR_LABELS = {
  FULL_DAY: "Full Day", HALF_DAY_FIRST: "1st Half",
  HALF_DAY_SECOND: "2nd Half", PERMISSION_HOURS: "Periods",
};

function DateRange({ start, end, duration }) {
  const same = start === end;
  return (
    <div className="text-sm">
      <p className="font-semibold text-gray-900 dark:text-white">
        {same ? start : `${start} → ${end}`}
      </p>
      <p className="text-xs text-gray-400">{DUR_LABELS[duration] || duration}</p>
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
        <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
      ))}
    </div>
  );

  if (!leaves?.length) return (
    <div className="py-16 text-center">
      <p className="text-gray-400 dark:text-gray-500 text-sm">No leave requests found.</p>
    </div>
  );

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
              {["Type", "Dates", "Days", "Reason", "Document", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {leaves.map((l) => {
              const canCancel = l.status === "PENDING" || l.status === "APPROVED";
              // Map CANCELLED from API to LEAVE_CANCELLED for StatusBadge to avoid color collision
              const badgeStatus = l.status === "CANCELLED" ? "LEAVE_CANCELLED" : l.status;
              return (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {TYPE_LABELS[l.leave_type] || l.leave_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <DateRange start={l.start_date} end={l.end_date} duration={l.duration} />
                    {l.period_numbers?.length > 0 && (
                      <p className="text-xs text-gray-400">Periods: {l.period_numbers.join(", ")}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                    {l.days_count === 0 ? "—" : l.days_count}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-2 text-xs leading-relaxed">
                      {l.reason}
                    </p>
                    {l.hod_comment && (
                      <p className="text-xs text-gray-400 mt-1 italic">HOD: {l.hod_comment}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {l.document_url ? (
                      <a
                        href={l.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={badgeStatus} />
                    {l.is_hod_initiated && (
                      <Badge variant="primary" className="ml-1 text-[10px]">HOD</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canCancel && (
                      <button
                        onClick={() => setCancelTarget(l)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
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

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMut.mutate(cancelTarget.id)}
        title="Cancel Leave Request"
        message={`Are you sure you want to cancel your ${TYPE_LABELS[cancelTarget?.leave_type]} leave for ${cancelTarget?.start_date}?${cancelTarget?.status === "APPROVED" ? " This will also restore the cancelled classes." : ""}`}
        confirmText="Yes, Cancel Leave"
        danger
      />
    </>
  );
}
