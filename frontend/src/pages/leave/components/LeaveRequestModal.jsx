import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitLeave } from "../../../api/leave";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { FileUpload } from "../../../components/shared/FileUpload";
import {
  CalendarDays, Stethoscope, Briefcase, Clock, Repeat,
  ChevronRight, ChevronLeft, Loader2, CheckCircle2
} from "lucide-react";

const LEAVE_TYPES = [
  { value: "CASUAL",     label: "Casual Leave",   icon: CalendarDays, color: "violet" },
  { value: "MEDICAL",    label: "Medical Leave",  icon: Stethoscope,  color: "rose"   },
  { value: "ON_DUTY",    label: "On Duty",        icon: Briefcase,    color: "amber"  },
  { value: "PERMISSION", label: "Permission",     icon: Clock,        color: "sky"    },
  { value: "COMP_OFF",   label: "Comp-Off",       icon: Repeat,       color: "emerald"},
];

const DURATIONS = [
  { value: "FULL_DAY",         label: "Full Day",         desc: "All periods"     },
  { value: "HALF_DAY_FIRST",   label: "First Half",       desc: "Periods 1–2"     },
  { value: "HALF_DAY_SECOND",  label: "Second Half",      desc: "Periods 3–5"     },
  { value: "PERMISSION_HOURS", label: "Specific Periods", desc: "Choose periods"  },
];

const PERIODS = [1, 2, 3, 4, 5];

const COLOR_RING = {
  violet:  "ring-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
  rose:    "ring-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
  amber:   "ring-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  sky:     "ring-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
  emerald: "ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
};

function Step1({ form, setForm }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Select the type of leave you need</p>
      <div className="grid grid-cols-1 gap-2.5">
        {LEAVE_TYPES.map((lt) => {
          const Icon = lt.icon;
          const selected = form.leave_type === lt.value;
          return (
            <button
              key={lt.value}
              onClick={() => setForm((f) => ({ ...f, leave_type: lt.value }))}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                selected
                  ? `ring-2 ${COLOR_RING[lt.color]} border-transparent`
                  : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                selected ? "bg-current/10" : "bg-gray-100 dark:bg-white/5"
              }`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{lt.label}</p>
                {lt.value === "PERMISSION" && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Single-day, max 3/month</p>
                )}
              </div>
              {selected && <CheckCircle2 className="w-4 h-4 ml-auto text-current" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step2({ form, setForm }) {
  const isPermission = form.leave_type === "PERMISSION";
  const relevantDurations = isPermission
    ? DURATIONS.filter((d) => d.value === "PERMISSION_HOURS")
    : DURATIONS.filter((d) => d.value !== "PERMISSION_HOURS");

  return (
    <div className="space-y-5">
      {/* Duration */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</label>
        <div className="grid grid-cols-1 gap-2">
          {relevantDurations.map((d) => (
            <button
              key={d.value}
              onClick={() => setForm((f) => ({ ...f, duration: d.value }))}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl border-2 text-left transition-all ${
                form.duration === d.value
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                  : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.label}</p>
                <p className="text-[11px] text-gray-400">{d.desc}</p>
              </div>
              {form.duration === d.value && <CheckCircle2 className="w-4 h-4 text-primary-500 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className={`grid ${isPermission || form.duration?.startsWith("HALF") ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {isPermission ? "Date" : "Start Date"}
          </label>
          <input
            type="date"
            value={form.start_date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setForm((f) => ({
              ...f,
              start_date: e.target.value,
              end_date: (isPermission || f.duration?.startsWith("HALF")) ? e.target.value : f.end_date,
            }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {!isPermission && !form.duration?.startsWith("HALF") && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">End Date</label>
            <input
              type="date"
              value={form.end_date}
              min={form.start_date || new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
      </div>

      {/* Period picker (Permission / PERMISSION_HOURS only) */}
      {(isPermission || form.duration === "PERMISSION_HOURS") && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Periods (select up to 2)
          </label>
          <div className="flex gap-2">
            {PERIODS.map((p) => {
              const sel = (form.period_numbers || []).includes(p);
              return (
                <button
                  key={p}
                  onClick={() => {
                    setForm((f) => {
                      const cur = f.period_numbers || [];
                      if (sel) return { ...f, period_numbers: cur.filter((x) => x !== p) };
                      if (cur.length >= 2) return f;
                      return { ...f, period_numbers: [...cur, p].sort((a, b) => a - b) };
                    });
                  }}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                    sel
                      ? "bg-primary-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Step3({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Reason <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={4}
          placeholder="Briefly describe the reason for your leave..."
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none placeholder:text-gray-400"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Supporting Document <span className="text-gray-400">(optional)</span>
        </label>
        <FileUpload
          accept=".pdf,image/*"
          onFileSelect={(file) => setForm((f) => ({ ...f, document: file }))}
        />
        {form.document && (
          <p className="text-xs text-primary-600 dark:text-primary-400">
            ✓ {form.document.name}
          </p>
        )}
      </div>
    </div>
  );
}

const TYPE_LABELS = { CASUAL: "Casual Leave", MEDICAL: "Medical Leave", ON_DUTY: "On Duty", PERMISSION: "Permission", COMP_OFF: "Comp-Off" };
const DUR_LABELS  = { FULL_DAY: "Full Day", HALF_DAY_FIRST: "First Half (Periods 1–2)", HALF_DAY_SECOND: "Second Half (Periods 3–5)", PERMISSION_HOURS: "Specific Periods" };

function StepSummary({ form }) {
  const days = form.start_date && form.end_date
    ? form.duration === "FULL_DAY"
      ? ((new Date(form.end_date) - new Date(form.start_date)) / 86400000 + 1) + " day(s)"
      : form.duration === "PERMISSION_HOURS" ? "0 days (permission)" : "0.5 day"
    : "—";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
      <div className="bg-gray-50 dark:bg-white/5 px-4 py-3 border-b border-gray-200 dark:border-white/10">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Review your request</p>
      </div>
      <div className="px-4 py-3 space-y-2 text-sm">
        {[
          ["Type", TYPE_LABELS[form.leave_type] || "—"],
          ["Duration", DUR_LABELS[form.duration] || "—"],
          ["From", form.start_date || "—"],
          ["To", form.end_date || form.start_date || "—"],
          ...(form.period_numbers?.length ? [["Periods", form.period_numbers.join(", ")]] : []),
          ["Days Count", days],
          ["Reason", form.reason || "—"],
          ...(form.document ? [["Attachment", form.document.name]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <span className="w-28 text-gray-400 dark:text-gray-500 shrink-0">{k}</span>
            <span className="text-gray-900 dark:text-white font-medium flex-1">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = ["Leave Type", "Duration & Dates", "Reason & Docs", "Review"];

export function LeaveRequestModal({ open, onClose }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    leave_type: "",
    duration: "FULL_DAY",
    start_date: "",
    end_date: "",
    period_numbers: [],
    reason: "",
    document: null,
  });

  const canNext = () => {
    if (step === 0) return !!form.leave_type;
    if (step === 1) {
      if (!form.start_date) return false;
      if (form.duration === "FULL_DAY" && !form.end_date) return false;
      if ((form.leave_type === "PERMISSION" || form.duration === "PERMISSION_HOURS") && !form.period_numbers?.length) return false;
      return true;
    }
    if (step === 2) return !!form.reason.trim();
    return true;
  };

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("leave_type", form.leave_type);
      fd.append("duration", form.duration);
      fd.append("start_date", form.start_date);
      fd.append("end_date", form.end_date || form.start_date);
      fd.append("reason", form.reason);
      if (form.period_numbers?.length) fd.append("period_numbers", JSON.stringify(form.period_numbers));
      if (form.document) fd.append("document", form.document);
      return submitLeave(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setStep(0);
    setForm({ leave_type: "", duration: "FULL_DAY", start_date: "", end_date: "", period_numbers: [], reason: "", document: null });
  };

  const handleClose = () => { onClose(); resetForm(); };

  return (
    <Modal open={open} onClose={handleClose} title="Request Leave" size="md">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-6 -mx-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex flex-col items-center flex-1 ${i > 0 ? "" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? "bg-primary-600 text-white" :
                i === step ? "bg-primary-600 text-white ring-4 ring-primary-200 dark:ring-primary-900" :
                "bg-gray-100 dark:bg-white/10 text-gray-400"
              }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${i === step ? "text-primary-600 dark:text-primary-400" : "text-gray-400"}`}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-6 mx-1 mb-4 rounded-full transition-colors ${i < step ? "bg-primary-600" : "bg-gray-200 dark:bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[240px]">
        {step === 0 && <Step1 form={form} setForm={setForm} />}
        {step === 1 && <Step2 form={form} setForm={setForm} />}
        {step === 2 && <Step3 form={form} setForm={setForm} />}
        {step === 3 && <StepSummary form={form} />}
      </div>

      {mutation.isError && (
        <p className="mt-3 text-sm text-rose-500 text-center">
          {mutation.error?.response?.data?.error || "Something went wrong. Please try again."}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
        <Button variant="ghost" onClick={step === 0 ? handleClose : () => setStep((s) => s - 1)}>
          {step === 0 ? "Cancel" : <><ChevronLeft className="w-4 h-4 mr-1" />Back</>}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : "Submit Request"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
