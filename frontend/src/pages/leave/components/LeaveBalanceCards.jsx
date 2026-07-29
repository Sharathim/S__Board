import { useQuery } from "@tanstack/react-query";
import { getMyBalance } from "../../../api/leave";
import {
  CalendarDays, Stethoscope, Briefcase, Clock, Repeat,
  TrendingDown, TrendingUp
} from "lucide-react";

const TYPE_META = {
  CASUAL:     { label: "Casual Leave",     icon: CalendarDays,  color: "from-violet-500 to-violet-700", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800/40" },
  MEDICAL:    { label: "Medical Leave",    icon: Stethoscope,   color: "from-rose-500 to-rose-700",    bg: "bg-rose-50 dark:bg-rose-950/30",    border: "border-rose-200 dark:border-rose-800/40"    },
  ON_DUTY:    { label: "On Duty",          icon: Briefcase,     color: "from-amber-500 to-amber-700",  bg: "bg-amber-50 dark:bg-amber-950/30",  border: "border-amber-200 dark:border-amber-800/40"  },
  PERMISSION: { label: "Permission",       icon: Clock,         color: "from-sky-500 to-sky-700",      bg: "bg-sky-50 dark:bg-sky-950/30",      border: "border-sky-200 dark:border-sky-800/40"      },
  COMP_OFF:   { label: "Comp-Off",         icon: Repeat,        color: "from-emerald-500 to-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/40" },
};

function BalanceCard({ balance }) {
  const meta = TYPE_META[balance.leave_type] || TYPE_META.CASUAL;
  const Icon = meta.icon;
  const isUnlimited = balance.entitled >= 999;
  const pct = isUnlimited ? 0 : Math.min(100, (balance.used / (balance.entitled || 1)) * 100);

  return (
    <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-4 flex flex-col gap-3 transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-sm`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {meta.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">
            {isUnlimited ? "∞" : balance.remaining}
          </span>
          {!isUnlimited && (
            <span className="text-sm text-gray-400 dark:text-gray-500 mb-0.5">
              / {balance.entitled} days
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">remaining</p>
      </div>

      {!isUnlimited && (
        <div className="space-y-1.5">
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {balance.used} used
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {balance.entitled} total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LeaveBalanceCards({ balances, academicYear, showTitle = true }) {
  if (!balances) return null;
  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Leave Balance</h3>
          {academicYear && (
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
              AY {academicYear.label}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {balances.map((b) => (
          <BalanceCard key={b.leave_type} balance={b} />
        ))}
      </div>
    </div>
  );
}

/** Self-loading variant — fetches its own data. For faculty view. */
export function FacultyBalanceCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["leave", "my", "balance"],
    queryFn: () => getMyBalance().then((r) => r.data),
  });

  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
      ))}
    </div>
  );
  if (error) return null;

  return (
    <LeaveBalanceCards
      balances={data.balances}
      academicYear={data.academic_year}
      showTitle
    />
  );
}
