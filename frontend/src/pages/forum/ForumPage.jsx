import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listForumMembers, listEligibleStudents, assignForumMember, removeForumMember, toggleForumCoordinator, listForumPosts, createForumPost, toggleForumPostLike } from "../../api/forum";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Textarea } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchPicker } from "../../components/shared/SearchPicker";
import { MessageSquare, Heart, Trash2, UserPlus, Crown, Send } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const FORUM_ROLES = ["Member", "Coordinator", "Secretary", "Treasurer", "Volunteer"];

export default function ForumPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [memberRole, setMemberRole] = useState("Member");

  const canPost = isHOD || user?.role === "FACULTY" || user?.student?.is_forum_member;

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

  const assignMutation = useMutation({
    mutationFn: ({ studentId, role }) => assignForumMember(studentId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-members"] });
      setPendingStudent(null);
      setMemberRole("Member");
    },
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
      <PageHeader title="Forum Members" subtitle={`${memberList.length} members`}>
        {isHOD && (
          <Button onClick={() => setPickerOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" /> Add Member
          </Button>
        )}
      </PageHeader>

      {memberList.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No forum members" description="HOD can assign 3A/3B students as forum members from the class pages." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {memberList.map(m => (
            <div key={m.id} className="group bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3 hover:shadow-card-hover hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-200">
              <Avatar src={m.profile_picture} name={m.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{m.name}</p>
                  {m.is_update_coordinator && <Badge variant="primary">Coord</Badge>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {m.role} · {m.class_name?.replace("_", " ")}
                </p>
              </div>
              {isHOD && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => coordMutation.mutate(m.id)}
                    title={m.is_update_coordinator ? "Remove coordinator" : "Make coordinator"}
                    className={`p-1.5 rounded-lg transition-colors ${m.is_update_coordinator ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20" : "text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"}`}
                  >
                    <Crown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeMutation.mutate(m.id)}
                    title="Remove from forum"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Posts Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Forum Posts</h2>

        {canPost && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <Textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="Share something with the forum…"
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={() => createMutation.mutate({ content: newPost })}
                loading={createMutation.isPending}
                disabled={!newPost.trim()}
                className="gap-2"
              >
                <Send className="w-4 h-4" /> Post
              </Button>
            </div>
          </div>
        )}

        {postList.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No posts yet" />
        ) : (
          postList.map(post => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-card-hover transition-shadow duration-200">
              <div className="flex items-center gap-2.5 mb-3">
                <Avatar src={post.posted_by?.profile_picture} name={post.posted_by?.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{post.posted_by?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    {format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}
                    {post.is_edited && <Badge variant="default">edited</Badge>}
                  </p>
                </div>
              </div>
              <p className="text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-wrap break-words">{post.content}</p>
              {post.attachment_url && post.attachment_type === "image" && (
                <img src={post.attachment_url} alt="attachment" className="rounded-lg max-h-80 object-cover mb-3" />
              )}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => likeMutation.mutate(post.id)}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${post.liked ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
                >
                  <Heart className={`w-4 h-4 ${post.liked ? "fill-red-500" : ""}`} />
                  <span>{post.like_count || 0}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Searchable student picker (HOD) */}
      <SearchPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add Forum Member"
        queryKey="eligible-students"
        fetchFn={(search) => listEligibleStudents(search).then(r => r.data.students)}
        onPick={(student) => { setPendingStudent(student); setPickerOpen(false); }}
        placeholder="Search 3A/3B students by name, email, roll…"
        emptyText="No eligible students found (3A/3B, not already members)."
      />

      {/* Role selection for the picked student */}
      {pendingStudent && (
        <RoleModal
          student={pendingStudent}
          role={memberRole}
          setRole={setMemberRole}
          onClose={() => setPendingStudent(null)}
          onConfirm={() => assignMutation.mutate({ studentId: pendingStudent.id, role: memberRole })}
          loading={assignMutation.isPending}
        />
      )}
    </div>
  );
}

function RoleModal({ student, role, setRole, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assign Forum Role</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar src={student.profile_picture} name={student.name} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{student.name}</p>
              <p className="text-xs text-gray-500 truncate">{student.class_name?.replace("_", " ")} · {student.email}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Forum Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {FORUM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={onConfirm} loading={loading} className="flex-1">Add Member</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
