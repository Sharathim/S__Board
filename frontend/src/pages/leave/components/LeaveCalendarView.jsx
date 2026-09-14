import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLeaveCalendar } from "../../../api/leave";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, User } from "lucide-react";

const TYPE_CONFIG = {
  CASUAL: { label:"Casual", badge:"bg-violet-100 text-violet-700 border-violet-200", dot:"bg-violet-500"},
  MEDICAL: { label:"Medical", badge:"bg-rose-100 text-rose-700 border-rose-200", dot:"bg-rose-500"},
  ON_DUTY: { label:"On Duty", badge:"bg-amber-100 text-amber-700 border-amber-200", dot:"bg-amber-500"},
  PERMISSION: { label:"Permission", badge:"bg-sky-100 text-sky-700 border-sky-200", dot:"bg-sky-500"},
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function AvatarInitials({ name, type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.CASUAL;
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return (
    <div className={`w-7 h-7 rounded-full ${cfg.dot} text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs`}>
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
      className={`min-h-[96px] sm:min-h-[105px] p-2 border-b border-r border-gray-200/70 relative transition-all ${
        date ?"bg-white":"bg-gray-50/50"
      } ${
        entries.length > 0
          ?"cursor-pointer hover:bg-primary-50/40"
          :"hover:bg-gray-50"
      }`}
      onClick={() => entries.length > 0 && onClick?.()}
    >
      {day && (
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-xs font-black transition-all ${
              isToday
                ?"w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md shadow-primary-500/30 ring-2 ring-primary-200"
                :"text-gray-500"
            }`}
          >
            {day}
          </span>
          {entries.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-100">
              {entries.length} {entries.length === 1 ? "leave" : "leaves"}
            </span>
          )}
        </div>
      )}

      <div className="space-y-1">
        {visible.map((e, i) => {
          const cfg = TYPE_CONFIG[e.leave_type] || TYPE_CONFIG.CASUAL;
          return (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all shadow-xs ${cfg.badge}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="truncate">{e.faculty_name?.split(" ")[0]}</span>
            </div>
          );
        })}
        {extra > 0 && (
          <div className="text-[10px] text-primary-600 font-bold pl-1">
            +{extra} more
          </div>
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

  const firstDay = new Date(year, month - 1, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon-based
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
            {MONTHS[month - 1]} {year}
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-all active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all active:scale-95 shadow-xs"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-all active:scale-95"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2.5 px-1">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <div key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${cfg.badge}`}>
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80">
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider border-r border-gray-100 last:border-0"
            >
              {d}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-gray-400">Loading calendar...</span>
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

      {/* Popover detail modal */}
      {popover && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setPopover(null)}
        >
          <div
            className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h4 className="text-base font-extrabold text-gray-900">{popover.date}</h4>
                <p className="text-xs text-gray-400 mt-0.5">Approved faculty leaves for this date</p>
              </div>
              <button
                onClick={() => setPopover(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {popover.entries.map((e, i) => {
                const cfg = TYPE_CONFIG[e.leave_type] || TYPE_CONFIG.CASUAL;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarInitials name={e.faculty_name} type={e.leave_type} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{e.faculty_name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {e.duration.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
