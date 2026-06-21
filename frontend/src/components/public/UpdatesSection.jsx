import { useState, useEffect } from "react";
import { listUpdates } from "../../api/updates";
import { format } from "date-fns";
import { Calendar, Heart } from "lucide-react";

export function UpdatesSection() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUpdates({ page: 1, per_page: 5 })
      .then(res => setUpdates(res.data.updates))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="updates" className="py-20 px-4 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Latest Updates
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Stay informed with the latest department news and announcements
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg h-24" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <p className="text-center text-gray-400">No updates yet.</p>
        ) : (
          <div className="space-y-4">
            {updates.map(update => (
              <div
                key={update.id}
                className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                  {update.is_edited && <span className="italic">(edited)</span>}
                </div>
                <p className="text-gray-800 dark:text-gray-200">{update.content}</p>
                {update.attachment_url && update.attachment_type === "image" && (
                  <img src={update.attachment_url} alt="attachment" className="mt-3 rounded-lg max-h-64 object-cover" />
                )}
                <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-400">
                  <Heart className="w-4 h-4" />
                  <span>{update.like_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
