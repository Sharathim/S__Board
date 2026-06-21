import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listForumMembers, assignForumMember, removeForumMember, toggleForumCoordinator, listForumPosts, createForumPost, toggleForumPostLike } from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { MessageSquare, Heart, Trash2, UserPlus, Crown } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function ForumPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then(r => r.data.members),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: () => listForumPosts({ page: 1, per_page: 20 }).then(r => r.data.posts),
  });

  const removeMutation = useMutation({
    mutationFn: removeForumMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-members"] }),
  });

  const coordMutation = useMutation({
    mutationFn: toggleForumCoordinator,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-members"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => createForumPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setNewPost("");
    },
  });

  const likeMutation = useMutation({
    mutationFn: toggleForumPostLike,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-posts"] }),
  });

  const memberList = members || [];
  const postList = posts || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Forum Members</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{memberList.length} members</p>
      </div>

      {memberList.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No forum members" description="Forum members from 3A/3B will appear here." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {memberList.map(m => (
            <div key={m.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <Avatar src={m.profile_picture} name={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.name}</p>
                <p className="text-xs text-gray-500">{m.role} · {m.class_name?.replace("_", " ")}</p>
              </div>
              <div className="flex items-center gap-1">
                {m.is_update_coordinator && <Badge variant="primary">Coord</Badge>}
                {isHOD && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => coordMutation.mutate(m.id)}>
                      <Crown className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(m.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Forum Posts</h2>

        {postList.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No posts yet" />
        ) : (
          postList.map(post => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span>{format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                {post.is_edited && <Badge variant="default">edited</Badge>}
              </div>
              <p className="text-gray-800 dark:text-gray-200 mb-3">{post.content}</p>
              {post.attachment_url && post.attachment_type === "image" && (
                <img src={post.attachment_url} alt="attachment" className="rounded-lg max-h-80 object-cover mb-3" />
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => likeMutation.mutate(post.id)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span>{post.like_count || 0}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
