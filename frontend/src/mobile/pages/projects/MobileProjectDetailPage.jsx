import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "../../../api/projects";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { FolderKanban, Users, Calendar } from "lucide-react";
import MobileCard from "../../components/MobileCard";
import { format } from "date-fns";

const getStatusTheme = (status) => {
  const map = {
    NOT_STARTED: { bg: "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
    IN_PROGRESS: { bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
    REVIEW: { bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    COMPLETED: { bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    ON_HOLD: { bg: "bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" },
    CANCELLED: { bg: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400", dot: "bg-red-500" },
  };
  return map[status] || { bg: "bg-slate-100", dot: "bg-slate-400" };
};

export default function MobileProjectDetailPage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", { page: 1, search: "", status: "" }],
    queryFn: () => listProjects({ page: 1, search: "", status: "", per_page: 100 }).then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const project = data?.projects?.find(p => String(p.id) === String(id));
  if (!project) return <div className="text-center py-16 text-gray-400">Project not found.</div>;

  const st = getStatusTheme(project.status);
  const allMembers = project.members || [];
  const facultyMembers = allMembers.filter(m => m.role_in_project === "faculty");
  const studentMembers = allMembers.filter(m => m.role_in_project === "student");
  const forumMembers = allMembers.filter(m => m.role_in_project === "forum_member");

  return (
    <div className="space-y-4 mobile-fade-in">
      {/* Hero card */}
      <MobileCard className="!p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight">{project.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/20 text-white`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {project.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex -space-x-1.5">
              {allMembers.slice(0, 5).map((m, i) => (
                <Avatar key={m.id || i} src={m.profile_picture} name={m.name} size="sm" className="ring-2 ring-white/30 w-7 h-7" />
              ))}
            </div>
            <span className="text-xs text-white/70 font-semibold">{allMembers.length} members</span>
          </div>
        </div>
      </MobileCard>

      {/* Description */}
      <MobileCard>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Description</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
          {project.description || "No description provided."}
        </p>
      </MobileCard>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MobileCard>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Lead Advisor</span>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-1 block truncate">
            {facultyMembers[0]?.name || "Unassigned"}
          </span>
        </MobileCard>
        <MobileCard>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Last Updated</span>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-1 block">
            {format(new Date(project.updated_at), "MMM d, yyyy")}
          </span>
        </MobileCard>
      </div>

      {/* Team Members */}
      {[
        { label: "Faculty", members: facultyMembers, color: "violet" },
        { label: "Students", members: studentMembers, color: "emerald" },
        { label: "Forum Members", members: forumMembers, color: "blue" },
      ].map(group => group.members.length > 0 && (
        <MobileCard key={group.label}>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">{group.label}</h2>
          <div className="space-y-2">
            {group.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-1">
                <Avatar src={m.profile_picture} name={m.name} size="sm" className={`ring-2 ring-${group.color}-500/20`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{m.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">{m.role_in_project?.replace("_", " ")}</p>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      ))}
    </div>
  );
}
