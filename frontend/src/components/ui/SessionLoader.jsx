import { Logo } from "./Logo";

/**
 * SessionLoader
 * Ultra-fast, minimal loading indicator without animation delays.
 */
export function SessionLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0B0F17]">
      <div className="flex flex-col items-center gap-3">
        <Logo
          variant="icon"
          className="w-12 h-12 object-contain filter drop-shadow-[0_4px_10px_rgba(240,90,43,0.25)]"
        />
        <h1 className="text-base font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
          Loading...
        </h1>
      </div>
    </div>
  );
}
