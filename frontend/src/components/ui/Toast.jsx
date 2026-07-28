import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import clsx from "clsx";

let toastId = 0;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = "error" }) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    const handler = (e) => addToast({ message: e.detail, type: "error" });
    window.addEventListener("api-error", handler);
    return () => window.removeEventListener("api-error", handler);
  }, [addToast]);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={clsx(
            "flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-right duration-200 backdrop-blur-md",
            toast.type === "error" && "bg-rose-50 border-rose-200 text-rose-800 dark:bg-[#1A2438] dark:border-rose-500/40 dark:text-rose-300",
            toast.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-[#1A2438] dark:border-emerald-500/40 dark:text-emerald-300",
            toast.type === "info" && "bg-sky-50 border-sky-200 text-sky-800 dark:bg-[#1A2438] dark:border-sky-500/40 dark:text-sky-300"
          )}
        >
          {toast.type === "error" && <XCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-500 dark:text-rose-400" />}
          {toast.type === "success" && <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />}
          {toast.type === "info" && <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-sky-500 dark:text-sky-400" />}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button onClick={() => remove(toast.id)} className="p-0.5 hover:opacity-70 text-gray-500 dark:text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const show = (message, type = "error") => {
    window.dispatchEvent(new CustomEvent("api-error", { detail: message }));
  };
  return { show };
}

export default ToastContainer;
