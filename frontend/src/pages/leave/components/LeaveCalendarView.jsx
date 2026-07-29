import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLeaveCalendar } from "../../../api/leave";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const TYPE_COLORS = {
  CASUAL:     "bg-violet-500",
  MEDICAL:    "bg-rose-500",
  ON_DUTY:    "bg-amber-500",
  PERMISSION: "bg-sky-500",
  COMP_OFF:   "bg-emerald-500",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function Avatar({ name, color, small }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const sz = small ? "w-6 h-6 text-[9px]" : "w-7 h-7 text-[10px]";
  return (
    <div className={`${sz} rounded-full ${color || "bg-gray-400"} text-white flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function DayCell({ date, entries, onClick }) {
  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;
  const day = date ? parseInt(date.split("-")[2], 10) : null;
  const visible = entries.slice(0, 3);
  const extra = entries.length - visible.length;

  return (
    <div
      className={`min-h-[88px] p-1.5 border-b border-r border-gray-100 dark:border-white/[0.05] relative ${
        entries.length > 0 ? "cursor-pointer hover:bg-primary-50/50 dark:hover:bg-primary-950/20" : ""
      } transition-colors`}
      onClick={() => entries.length > 0 && onClick?.()}
    >
      {day && (
        <span className={`text-[11px] font-bold leading-none ${
          isToday
            ? "w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center"
            : "text-gray-400 dark:text-gray-500"
        }`}>
          {day}
        </span>
      )}
      <div className="mt-1 space-y-0.5">
        {visible.map((e, i) => (
          <div key={i} className="flex items-center gap-1 rounded-md px-1 py-0.5 bg-white/80 dark:bg-white/5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_COLORS[e.leave_type] || "bg-gray-400"}`} />
            <span className="text-[10px] text-gray-700 dark:text-gray-300 truncate">{e.faculty_name?.split(" ")[0]}</span>
          </div>
        ))}
        {extra > 0 && (
          <div className="text-[10px] text-primary-500 font-semibold pl-1">+{extra} more</div>
        )}
      </div>
    </div>
  );
}

export function LeaveCalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [popover, setPopover] = useState(null); // { date, entries }

  const { data, isLoading } = useQuery({
    queryKey: ["leave", "calendar", year, month],
    queryFn: () => getLeaveCalendar(year, month).then((r) => r.data.calendar),
    staleTime: 60_000,
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Build grid — fill leading/trailing empty cells so Mon always starts col 0
  const firstDay = new Date(year, month - 1, 1);
  // isoWeekday: Mon=1, but JS getDay: Sun=0
  const startDow = (firstDay.getDay() + 6) % 7; // Mon-based offset
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
          {MONTHS[month - 1]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            Today
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_COLORS).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cls}`} />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {type.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-r border-gray-100 dark:border-white/[0.05] last:border-0">
              {d}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((dateStr, i) => (
              <DayCell
                key={i}
                date={dateStr}
                entries={dateStr && data ? (data[dateStr] || []) : []}
                onClick={() => dateStr && data?.[dateStr] && setPopover({ date: dateStr, entries: data[dateStr] })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Popover */}
      {popover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setPopover(null)}>
          <div
            className="bg-white dark:bg-[#171E2E] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl p-5 w-full max-w-sm animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900 dark:text-white">{popover.date}</h4>
              <button onClick={() => setPopover(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {popover.entries.map((e, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5">
                  <Avatar name={e.faculty_name} color={TYPE_COLORS[e.leave_type]} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{e.faculty_name}</p>
                    <p className="text-xs text-gray-400">{e.leave_type.replace(/_/g, " ")} · {e.duration.replace(/_/g, " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
