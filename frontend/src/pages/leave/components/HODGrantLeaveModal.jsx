import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { grantLeave } from "../../../api/leave";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Loader2 } from "lucide-react";
import { listFaculty } from "../../../api/faculty";

const LEAVE_TYPES = [
  { value: "CASUAL",     label: "Casual Leave"  },
  { value: "MEDICAL",    label: "Medical Leave" },
  { value: "ON_DUTY",    label: "On Duty"       },
  { value: "PERMISSION", label: "Permission"    },
];
const DURATIONS = [
  { value: "FULL_DAY",         label: "Full Day"         },
  { value: "HALF_DAY_FIRST",   label: "First Half (1–2)" },
  { value: "HALF_DAY_SECOND",  label: "Second Half (3–5)"},
  { value: "PERMISSION_HOURS", label: "Specific Periods" },
];
const PERIODS = [1, 2, 3, 4, 5];

const DEFAULT_FORM = {
  faculty_id: null,
  leave_type: "CASUAL",
  duration: "FULL_DAY",
  start_date: "",
  end_date: "",
  period_numbers: [],
  reason: "",
};

export function HODGrantLeaveModal({ open, onClose, prefillFacultyId = null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...DEFAULT_FORM, faculty_id: prefillFacultyId });

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        faculty_id: form.faculty_id,
        leave_type: form.leave_type,
        duration: form.duration,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        reason: form.reason,
      };
      if (form.period_numbers?.length) payload.period_numbers = form.period_numbers;
      return grantLeave(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      handleClose();
    },
  });

  const handleClose = () => {
    setForm({ ...DEFAULT_FORM, faculty_id: prefillFacultyId });
    onClose();
  };

  const isPermission = form.leave_type === "PERMISSION" || form.duration === "PERMISSION_HOURS";
  const isSingleDay = isPermission || form.duration?.startsWith("HALF");

  const canSubmit = form.faculty_id && form.start_date && form.reason.trim() &&
    (isPermission ? (form.period_numbers?.length > 0) : true);

  return (
    <Modal open={open} onClose={handleClose} title="Grant Leave to Faculty" size="md">
      <div className="space-y-5">
        {/* Faculty picker */}
        {!prefillFacultyId && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Faculty Member</label>
            <select
              value={form.faculty_id || ""}
              onChange={(e) => setForm((f) => ({ ...f, faculty_id: e.target.value ? parseInt(e.target.value) : null }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a faculty member…</option>
              {(facultyData || []).map((f) => (
                <option key={f.id} value={f.id}>{f.name} — {f.designation}</option>
              ))}
            </select>
          </div>
        )}

        {/* Leave type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leave Type</label>
          <div className="flex flex-wrap gap-2">
            {LEAVE_TYPES.map((lt) => (
              <button
                key={lt.value}
                onClick={() => setForm((f) => ({ ...f, leave_type: lt.value }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  form.leave_type === lt.value
                    ? "bg-primary-600 text-white shadow-sm"
                    :"bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {lt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setForm((f) => ({ ...f, duration: d.value }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  form.duration === d.value
                    ? "bg-primary-600 text-white shadow-sm"
                    :"bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period picker */}
        {isPermission && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Periods (up to 2)</label>
            <div className="flex gap-2">
              {PERIODS.map((p) => {
                const sel = (form.period_numbers || []).includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => setForm((f) => {
                      const cur = f.period_numbers || [];
                      if (sel) return { ...f, period_numbers: cur.filter((x) => x !== p) };
                      if (cur.length >= 2) return f;
                      return { ...f, period_numbers: [...cur, p].sort((a, b) => a - b) };
                    })}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                      sel ?"bg-primary-600 text-white shadow-md":"bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dates */}
        <div className={`grid ${isSingleDay ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isSingleDay ? "Date" : "Start Date"}
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({
                ...f,
                start_date: e.target.value,
                end_date: isSingleDay ? e.target.value : f.end_date,
              }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {!isSingleDay && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date</label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</label>
          <textarea
            rows={3}
            placeholder="Reason for granting this leave..."
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none placeholder:text-gray-400"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-rose-500">{mutation.error?.response?.data?.error || "Failed to grant leave."}</p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Granting…</> : "Grant Leave"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
