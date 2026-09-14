import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeaveSettings, updateLeaveSettings } from "../../../api/leave";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Loader2, Sliders, CheckCircle2, ShieldAlert } from "lucide-react";

export function HODLeaveSettingsModal({ open, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    monthly_permission_quota: 3,
    max_permission_hours: 2,
    default_casual_leave: 12,
    default_medical_leave: 12,
    default_on_duty_leave: 999,
    apply_to_all: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["leave", "settings"],
    queryFn: () => getLeaveSettings().then((r) => r.data.settings),
    enabled: open,
  });

  useEffect(() => {
    if (data) {
      setForm((f) => ({
        ...f,
        monthly_permission_quota: data.monthly_permission_quota ?? 3,
        max_permission_hours: data.max_permission_hours ?? 2,
        default_casual_leave: data.default_casual_leave ?? 12,
        default_medical_leave: data.default_medical_leave ?? 12,
        default_on_duty_leave: data.default_on_duty_leave ?? 999,
      }));
    }
  }, [data]);

  const updateMut = useMutation({
    mutationFn: (payload) => updateLeaveSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMut.mutate(form);
  };

  return (
    <Modal open={open} onClose={onClose} title="Configure Default Leave & Permission Limits" size="md">
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <p className="text-xs text-gray-500 leading-relaxed">
            Set the default permission quota, maximum hours per permission, and annual leave limits for faculty members in your department.
          </p>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-800 font-medium">
              These settings control the maximum permissions and leaves a faculty can request each month/year.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Permission Quota */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <label className="text-xs font-bold text-gray-700">
                Monthly Permission Quota
              </label>
              <p className="text-[11px] text-gray-400">Max permissions / month</p>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={form.monthly_permission_quota}
                onChange={(e) => setForm({ ...form, monthly_permission_quota: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Max Hours / Periods per Permission */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <label className="text-xs font-bold text-gray-700">
                Max Hours / Periods
              </label>
              <p className="text-[11px] text-gray-400">Max periods per permission</p>
              <input
                type="number"
                min="1"
                max="5"
                required
                value={form.max_permission_hours}
                onChange={(e) => setForm({ ...form, max_permission_hours: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Default Casual Leave */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <label className="text-xs font-bold text-gray-700">
                Default Casual Leave (CL)
              </label>
              <p className="text-[11px] text-gray-400">Annual days entitlement</p>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={form.default_casual_leave}
                onChange={(e) => setForm({ ...form, default_casual_leave: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Default Medical Leave */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <label className="text-xs font-bold text-gray-700">
                Default Medical Leave (ML)
              </label>
              <p className="text-[11px] text-gray-400">Annual days entitlement</p>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={form.default_medical_leave}
                onChange={(e) => setForm({ ...form, default_medical_leave: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Apply to existing faculty checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-primary-50/60 border border-primary-100 cursor-pointer">
            <input
              type="checkbox"
              checked={form.apply_to_all}
              onChange={(e) => setForm({ ...form, apply_to_all: e.target.checked })}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-800">
              Apply these updated default limits to all existing faculty members
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sliders className="w-4 h-4 mr-1" />}
              Save Default Limits
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
