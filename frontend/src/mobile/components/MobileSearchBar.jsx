import { Search, X } from "lucide-react";

/**
 * Sticky search input for mobile pages. Full width, rounded.
 */
export default function MobileSearchBar({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 min-h-[44px] text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
