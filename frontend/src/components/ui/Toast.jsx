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
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={clsx(
            "flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right duration-200",
            toast.type === "error" && "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-800 dark:text-red-200",
            toast.type === "success" && "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-800 dark:text-green-200",
            toast.type === "info" && "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-200"
          )}
        >
          {toast.type === "error" && <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
          {toast.type === "success" && <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />}
          {toast.type === "info" && <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
          <p className="text-sm flex-1">{toast.message}</p>
          <button onClick={() => remove(toast.id)} className="p-0.5 hover:opacity-70">
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
