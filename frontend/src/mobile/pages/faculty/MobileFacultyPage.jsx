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
      {/* Invite Banner (HOD only) */}
      {isHOD && invite && (
        <MobileCard className={`!border ${invite.is_active ? "!border-emerald-200 dark:!border-emerald-800/50" : ""}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              invite.is_active ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-gray-100 dark:bg-slate-800"
            }`}>
              <Link2 className={`w-4 h-4 ${invite.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white">Faculty Invite Link</p>
              <p className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                invite.is_active ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-slate-800 text-gray-500"
              }`}>
                {invite.is_active ? "ACTIVE" : "INACTIVE"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {invite.is_active && invite.invite_link && (
              <button onClick={handleCopy} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                copied ? "bg-emerald-500 text-white" : "bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300"
              }`}>
                {copied ? <><CheckCheck className="w-3.5 h-3.5 inline mr-1" />Copied!</> : <><Copy className="w-3.5 h-3.5 inline mr-1" />Copy Link</>}
              </button>
            )}
            <button
              onClick={() => toggleInviteMutation.mutate()}
              disabled={toggleInviteMutation.isPending}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                invite.is_active
                  ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50"
                  : "bg-emerald-500 text-white shadow-sm"
              }`}
            >
              {invite.is_active ? "Disable" : "Enable"}
            </button>
          </div>
        </MobileCard>
      )}

      <MobileSearchBar value={search} onChange={setSearch} placeholder="Search faculty..." />

      {filtered.length === 0 ? (
        <MobileEmptyState icon={GraduationCap} title="No faculty found" description={isHOD ? "Enable the invite link to let faculty register." : "Faculty will appear here."} />
      ) : (
        <div className="space-y-3">
          {filtered.map(fac => (
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
