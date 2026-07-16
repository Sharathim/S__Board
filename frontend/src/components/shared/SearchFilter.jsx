import { Search, ChevronDown } from "lucide-react";

export function SearchFilter({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-3.5 h-10 rounded-full text-xs text-gray-900 dark:text-gray-100 placeholder-gray-450 focus:outline-none transition-all neomorph-input"
      />
    </div>
  );
}

export function StatusFilter({ value, onChange, options = [], className = "" }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pl-4 pr-8 h-10 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none transition-all neomorph-input appearance-none cursor-pointer ${className}`}
        style={{ minWidth: "124px" }}
      >
        <option value="">All Status</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-450 dark:text-gray-500 pointer-events-none" />
    </div>
  );
}
