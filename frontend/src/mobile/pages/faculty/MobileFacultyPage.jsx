import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFaculty, deleteFaculty, getFacultyInvite, toggleFacultyInvite } from "../../../api/faculty";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import {
  GraduationCap, Mail, FolderKanban, Trash2,
  Link2, Star, TrendingUp, Copy, CheckCheck,
} from "lucide-react";
import { useState } from "react";
import MobileCard from "../../components/MobileCard";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileEmptyState from "../../components/MobileEmptyState";

function DesignationBadge({ designation }) {
  const map = {
    "Professor":           { bg: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300", icon: Star },
    "Associate Professor": { bg: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300", icon: TrendingUp },
    "Assistant Professor": { bg: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300", icon: GraduationCap },
  };
  const style = map[designation] || map["Professor"];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${style.bg}`}>
      <Icon className="w-3 h-3" />
      {designation}
    </span>
  );
}

export default function MobileFacultyPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
  });

  const { data: invite } = useQuery({
    queryKey: ["faculty-invite"],
    queryFn: () => getFacultyInvite().then(r => r.data),
    enabled: isHOD,
  });

  const toggleInviteMutation = useMutation({
    mutationFn: toggleFacultyInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculty-invite"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaculty,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["faculty"] }); setDeleteTarget(null); },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const facultyList = data || [];
  const filtered = search
    ? facultyList.filter(f => f.name?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase()))
    : facultyList;

  const handleCopy = () => {
    if (invite?.invite_link) {
      navigator.clipboard.writeText(invite.invite_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-4 mobile-fade-in">
      {/* Top Header/Button Row - left side free, right end button */}
      {isHOD && invite && (
        <div className="flex justify-between items-center py-1">
          <div />
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200/60 dark:border-slate-800/80 shadow-sm shrink-0">
            <button
              onClick={() => toggleInviteMutation.mutate()}
              disabled={toggleInviteMutation.isPending}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                invite.is_active
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span>+ Faculty</span>
            </button>
            {invite.is_active && invite.invite_link && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(invite.invite_link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Copy Invite Link"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      )}

      {facultyList.length === 0 ? (
        <MobileEmptyState icon={GraduationCap} title="No faculty found" description={isHOD ? "Enable the invite link to let faculty register." : "Faculty will appear here."} />
      ) : (
        <div className="space-y-3">
          {facultyList.map(fac => (
            <MobileCard key={fac.id}>
              <div className="flex items-start gap-3">
                <Avatar src={fac.profile_picture} name={fac.name} size="md" className="ring-2 ring-gray-100 dark:ring-slate-700 w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{fac.name}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{fac.email}</p>
                  <div className="mt-1.5">
                    <DesignationBadge designation={fac.designation || "Professor"} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={`mailto:${fac.email}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                    <Mail className="w-4 h-4" />
                  </a>
                  {isHOD && (
                    <button onClick={() => setDeleteTarget(fac)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Classes handling */}
              <div className="flex flex-wrap gap-1 mt-3">
                {fac.classes_handling?.length > 0 ? (
                  fac.classes_handling.map(cls => (
                    <span key={cls} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/30">
                      {cls.replace("_", " ")}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-400 italic">No classes</span>
                )}
                {fac.class_incharge_of && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
                    IC: {fac.class_incharge_of.replace("_", " ")}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-dashed border-gray-100 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Projects</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  fac.project_count > 0 ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" : "bg-gray-50 dark:bg-slate-800 text-gray-400"
                }`}>{fac.project_count || 0} active</span>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Remove Faculty"
        message={`Remove ${deleteTarget?.name}? This action is permanent.`}
        confirmText={deleteMutation.isPending ? "Removing…" : "Remove"}
        danger
      />
    </div>
  );
}
