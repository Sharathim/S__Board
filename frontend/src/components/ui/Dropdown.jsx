import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export function Dropdown({ trigger, children, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger || <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />}
      </div>
      {open && (
        <div
          className={clsx(
            "absolute z-50 mt-1.5 min-w-[180px] bg-white dark:bg-[#1A2438] rounded-xl shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-white/10 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150",
            align === "right" ? "right-0" : "left-0"
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-4 py-2 text-sm font-medium transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-rose-400 dark:hover:bg-rose-500/15"
          : "text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800/90"
      )}
    >
      {children}
    </button>
  );
}

export default Dropdown;
