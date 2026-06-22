import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { Search } from "lucide-react";

/**
 * Reusable searchable picker modal. Debounces the search term, queries
 * `fetchFn(search)`, and renders results as selectable rows.
 *
 * fetchFn(search) -> Promise resolving to an array of:
 *   { id|key, name, subtitle, profile_picture }
 * onPick(item) is called when a row is clicked.
 */
export function SearchPicker({
  open,
  onClose,
  title,
  queryKey,
  fetchFn,
  onPick,
  picking = false,
  placeholder = "Search…",
  emptyText = "No results.",
  footer,
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) { setSearch(""); setDebounced(""); }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, debounced],
    queryFn: () => fetchFn(debounced),
    enabled: open,
  });

  const items = data || [];

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1.5">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Searching…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">{emptyText}</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id ?? item.key ?? `${item.kind}-${item.ref_id}`}
                onClick={() => onPick(item)}
                disabled={picking}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-all text-left disabled:opacity-50"
              >
                <Avatar src={item.profile_picture} name={item.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                  {item.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {footer}
      </div>
    </Modal>
  );
}
