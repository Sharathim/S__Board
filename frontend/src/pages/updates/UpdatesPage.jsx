import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUpdates, createUpdate, editUpdate, deleteUpdate, toggleUpdateLike } from "../../api/updates";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/shared/Pagination";
import { Newspaper, Plus, Heart, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function UpdatesPage() {
  const { user } = useAuth();
  const isCoordinator = user?.role === "HOD" || user?.faculty?.is_update_coordinator;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [content, setContent] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["updates", page],
    queryFn: () => listUpdates({ page, per_page: 10 }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => createUpdate({ content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setShowCreate(false);
      setContent("");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }) => editUpdate(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setEditTarget(null);
      setContent("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      setDeleteTarget(null);
    },
  });

  const likeMutation = useMutation({
    mutationFn: toggleUpdateLike,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["updates"] }),
  });

  if (isLoading) return <Spinner />;

  const updates = data?.updates || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Updates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Department announcements and updates</p>
        </div>
        {isCoordinator && (
          <Button onClick={() => { setContent(""); setShowCreate(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> New Update
          </Button>
        )}
      </div>

      {updates.length === 0 ? (
        <EmptyState icon={Newspaper} title="No updates" description="Updates from coordinators will appear here." />
      ) : (
        <div className="space-y-4">
          {updates.map(update => (
            <div key={update.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  {update.is_edited && <Badge variant="default">edited</Badge>}
                </div>
                {/* Actions for the update poster */}
                {update.posted_by === user?.id && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditTarget(update); setContent(update.content); }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => setDeleteTarget(update.id)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-gray-800 dark:text-gray-200">{update.content}</p>
              {update.attachment_url && update.attachment_type === "image" && (
                <img src={update.attachment_url} alt="attachment" className="mt-3 rounded-lg max-h-80 object-cover" />
              )}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => likeMutation.mutate(update.id)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Heart className={`w-4 h-4 ${update.liked ? "fill-red-500 text-red-500" : ""}`} />
                  <span>{update.like_count || 0}</span>
                </button>
              </div>
            </div>
          ))}
          <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Update">
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your update..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!content.trim()} className="w-full">
            Post Update
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Update">
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button onClick={() => editMutation.mutate({ id: editTarget.id, content })} loading={editMutation.isPending} disabled={!content.trim()} className="w-full">
            Save Changes
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget)}
        title="Delete Update"
        message="Are you sure you want to delete this update?"
        confirmText="Delete"
        danger
      />
    </div>
  );
}
