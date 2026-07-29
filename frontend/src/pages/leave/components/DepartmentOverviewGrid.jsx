import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDepartmentOverview, updateLeaveBalance, setFacultyEntitlement } from "../../../api/leave";
import { LeaveBalanceCards } from "./LeaveBalanceCards";
import { ChevronRight, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";

const TYPE_ORDER = ["CASUAL", "MEDICAL", "ON_DUTY", "PERMISSION", "COMP_OFF"];
const TYPE_SHORT = { CASUAL: "CL", MEDICAL: "ML", ON_DUTY: "OD", PERMISSION: "Perm", COMP_OFF: "CO" };
const TYPE_NAMES = { CASUAL: "Casual Leave (days)", MEDICAL: "Medical Leave (days)", ON_DUTY: "On Duty (days)", PERMISSION: "Permission Quota (per month)", COMP_OFF: "Comp-Off (days)" };

function FacultyRow({ item, onClick, onEdit }) {
  const balanceMap = {};
  item.balances.forEach((b) => { balanceMap[b.leave_type] = b; });

  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
      onClick={onClick}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {(item.faculty_name || "?").charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-sm text-gray-900 dark:text-white">{item.faculty_name}</span>
        </div>
      </td>
      {TYPE_ORDER.map((type) => {
        const b = balanceMap[type];
        const isUnlimited = b && b.entitled >= 999;
        return (
          <td key={type} className="px-4 py-3 whitespace-nowrap text-center">
            {b ? (
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {isUnlimited ? "∞" : b.remaining}
                </p>
                <p className="text-[10px] text-gray-400">
                  {isUnlimited ? "—" : `${b.used}/${b.entitled}`}
                </p>
              </div>
            ) : (
              <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
            )}
          </td>
        );
      })}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 dark:text-primary-400 transition-colors"
          title="Edit Leave Entitlements"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

export function DepartmentOverviewGrid() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editValues, setEditValues] = useState({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["leave", "overview"],
    queryFn: () => getDepartmentOverview().then((r) => r.data),
  });

  const updateMut = useMutation({
    mutationFn: async ({ balances }) => {
      for (const b of balances) {
        await updateLeaveBalance(b.id, b.entitled);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      setEditingFaculty(null);
    },
  });

  const handleOpenEdit = (facultyItem) => {
    setEditingFaculty(facultyItem);
    const initial = {};
    facultyItem.balances.forEach((b) => {
      initial[b.id] = b.entitled;
    });
    setEditValues(initial);
  };

  const handleSaveEntitlements = () => {
    if (!editingFaculty) return;
    const balancesToUpdate = editingFaculty.balances.map((b) => ({
      id: b.id,
      entitled: parseFloat(editValues[b.id] ?? b.entitled),
    }));
    updateMut.mutate({ balances: balancesToUpdate });
  };

  if (isLoading) return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
      ))}
    </div>
  );
  if (error) return <p className="text-sm text-rose-500">Failed to load overview.</p>;
  if (!data?.faculty?.length) return <p className="text-sm text-gray-400">No balance data yet for this academic year.</p>;

  const selectedItem = data.faculty.find((f) => f.faculty_id === selected);

  return (
    <div className="space-y-4">
      {/* AY label */}
      {data.academic_year && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Academic Year</span>
            <span className="text-xs bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full font-semibold">
              {data.academic_year.label}
            </span>
          </div>
          <span className="text-xs text-gray-400">Click pencil icon to edit faculty leave limits</span>
        </div>
      )}

      {/* Per-faculty drilldown */}
      {selectedItem && (
        <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900 dark:text-white">{selectedItem.faculty_name}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(selectedItem)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Limits
              </Button>
              <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                Close ×
              </button>
            </div>
          </div>
          <LeaveBalanceCards balances={selectedItem.balances} showTitle={false} />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                Faculty
              </th>
              {TYPE_ORDER.map((t) => (
                <th key={t} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  {TYPE_SHORT[t]}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Edit
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {data.faculty.map((item) => (
              <FacultyRow
                key={item.faculty_id}
                item={item}
                onClick={() => setSelected(item.faculty_id === selected ? null : item.faculty_id)}
                onEdit={handleOpenEdit}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Entitlements Modal */}
      <Modal open={!!editingFaculty} onClose={() => setEditingFaculty(null)} title={`Set Leave Entitlements — ${editingFaculty?.faculty_name || ''}`}>
        <div className="space-y-4 pt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Set the default annual leave days / monthly permission quota for this faculty member.
          </p>
          <div className="space-y-3">
            {editingFaculty?.balances.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{TYPE_NAMES[b.leave_type] || b.leave_type}</p>
                  <p className="text-xs text-gray-400">Currently used: {b.used} | Remaining: {b.remaining}</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editValues[b.id] ?? b.entitled}
                    onChange={(e) => setEditValues({ ...editValues, [b.id]: e.target.value })}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-gray-900 dark:text-white font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-400 font-medium">lim</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
            <Button variant="ghost" onClick={() => setEditingFaculty(null)}>Cancel</Button>
            <Button onClick={handleSaveEntitlements} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save Entitlements"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
