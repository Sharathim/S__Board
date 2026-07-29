import { useQuery } from "@tanstack/react-query";
import { getMyBalance } from "../../../api/leave";
import {
  CalendarDays, Stethoscope, Briefcase, Clock, Repeat,
  TrendingDown, TrendingUp
} from "lucide-react";

const TYPE_META = {
  CASUAL:     { label: "Casual Leave",     icon: CalendarDays,  color: "from-violet-500 to-violet-700", bg: "bg-violet-50/70 dark:bg-violet-950/30", border: "border-violet-200/80 dark:border-violet-900/40", text: "text-violet-700 dark:text-violet-300" },
  MEDICAL:    { label: "Medical Leave",    icon: Stethoscope,   color: "from-rose-500 to-rose-700",    bg: "bg-rose-50/70 dark:bg-rose-950/30",    border: "border-rose-200/80 dark:border-rose-900/40",    text: "text-rose-700 dark:text-rose-300"    },
  ON_DUTY:    { label: "On Duty",          icon: Briefcase,     color: "from-amber-500 to-amber-700",  bg: "bg-amber-50/70 dark:bg-amber-950/30",  border: "border-amber-200/80 dark:border-amber-900/40",  text: "text-amber-700 dark:text-amber-300"  },
  PERMISSION: { label: "Permission",       icon: Clock,         color: "from-sky-500 to-sky-700",      bg: "bg-sky-50/70 dark:bg-sky-950/30",      border: "border-sky-200/80 dark:border-sky-900/40",      text: "text-sky-700 dark:text-sky-300"      },
  COMP_OFF:   { label: "Comp-Off",         icon: Repeat,        color: "from-emerald-500 to-emerald-700", bg: "bg-emerald-50/70 dark:bg-emerald-950/30", border: "border-emerald-200/80 dark:border-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
};

function BalanceCard({ balance }) {
  const meta = TYPE_META[balance.leave_type] || TYPE_META.CASUAL;
  const Icon = meta.icon;
  const isUnlimited = balance.entitled >= 999;
  const pct = isUnlimited ? 0 : Math.min(100, (balance.used / (balance.entitled || 1)) * 100);

  return (
    <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-4 flex flex-col gap-3 transition-all hover:shadow-md backdrop-blur-xs`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-md shadow-primary-500/20`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`text-xs font-black uppercase tracking-wider ${meta.text}`}>
          {meta.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-black text-gray-900 dark:text-slate-100 leading-none">
            {isUnlimited ? "∞" : balance.remaining}
          </span>
          {!isUnlimited && (
            <span className="text-xs font-bold text-gray-400 dark:text-slate-400 mb-0.5">
              / {balance.entitled} days
            </span>
          )}
        </div>
        <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">remaining</p>
      </div>

      {!isUnlimited && (
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 rounded-full bg-gray-200/80 dark:bg-slate-800/80 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-rose-500" />
              {balance.used} used
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
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
          <h3 className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Leave Balance Overview</h3>
          {academicYear && (
            <span className="text-xs font-bold text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700/80 px-2.5 py-0.5 rounded-full shadow-xs">
              AY {academicYear.label}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
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
        <div key={i} className="h-36 rounded-2xl bg-gray-100 dark:bg-slate-800/40 animate-pulse" />
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
