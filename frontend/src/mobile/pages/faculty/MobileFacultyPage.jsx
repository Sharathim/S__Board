import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFaculty, deleteFaculty, getFacultyInvite, toggleFacultyInvite,
} from "../../../api/faculty";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Switch } from "../../../components/ui/Switch";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";
import MobileSectionHeader from "../../components/MobileSectionHeader";
import BottomSheet from "../../layout/BottomSheet";
import {
  Users, Mail, GraduationCap, BookOpen,
  FolderKanban, Search, Copy, CheckCheck,
  Star, TrendingUp, MoreVertical, Trash2,
  ChevronRight, ShieldCheck, Link2, X,
} from "lucide-react";
import { useState, useMemo } from "react";

function DesignationBadge({ designation }) {
  const map = {
    "Professor": { color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: Star },
    "Associate Professor": { color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: TrendingUp },
    "Assistant Professor": { color: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: GraduationCap },
  };
  const style = map[designation] || map["Professor"];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${style.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {designation}
    </span>
  );
}

export default function MobileFacultyPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [actionSheet, setActionSheet] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const { data: facultyData, isLoading } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
  });

  const { data: inviteData } = useQuery({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
      setDeleteConfirm(null);
      setActionSheet(null);
    },
  });

  const facultyList = facultyData || [];
  const filtered = useMemo(() => {
    if (!search.trim()) return facultyList;
    const q = search.toLowerCase();
    return facultyList.filter(f =>
      f.name?.toLowerCase().includes(q) ||
      f.email?.toLowerCase().includes(q) ||
      f.designation?.toLowerCase().includes(q)
    );
  }, [facultyList, search]);

  const copyInviteLink = async () => {
    if (inviteData?.invite_link) {
      try {
        await navigator.clipboard.writeText(inviteData.invite_link);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
      } catch {}
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mobile-fade-in pb-6 space-y-4">
      {/* HOD Invite Toggle & Banner */}
      {isHOD && inviteData && (
        <div className="space-y-2">
          <MobileCard>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <Users className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">New Faculty Registration</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {inviteData.is_active ? "Registration is OPEN" : "Registration is CLOSED"}
                  </p>
                </div>
              </div>
              <Switch
                checked={inviteData.is_active}
                onChange={() => toggleInviteMutation.mutate()}
                loading={toggleInviteMutation.isPending}
                size="sm"
              />
            </div>
          </MobileCard>

          {inviteData.is_active && inviteData.invite_link && (
            <MobileCard className="!bg-indigo-50 dark:!bg-indigo-950/20 !border-indigo-200/60 dark:!border-indigo-800/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Invite Link Active</p>
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate mt-0.5">{inviteData.invite_link}</p>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="mobile-tappable p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold"
                >
                  {inviteCopied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </MobileCard>
          )}
        </div>
      )}

      {/* Search */}
      <MobileSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search faculty..."
      />

      {/* Count */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {filtered.length} Faculty Members
        </span>
      </div>

      {/* Faculty List */}
      {filtered.length === 0 ? (
        <MobileEmptyState
          icon={Users}
          title="No faculty found"
          description={search ? "Try a different search term" : "No faculty members registered yet."}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((fac) => (
            <MobileCard key={fac.id}>
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 ring-2 ring-indigo-500/20">
                  <Avatar src={fac.profile_picture} name={fac.name} size="md" className="w-full h-full" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + Designation */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{fac.name}</h3>
                    {fac.id === user?.id && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-md uppercase">
                        You
                      </span>
                    )}
                  </div>
                  {fac.designation && (
                    <div className="mt-1">
                      <DesignationBadge designation={fac.designation} />
                    </div>
                  )}

                  {/* Email */}
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">{fac.email}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {fac.class_incharge_of && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        {fac.class_incharge_of.replace("_", " ")}
                      </div>
                    )}
                    {fac.project_count > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                        <FolderKanban className="w-3 h-3" />
                        {fac.project_count} Projects
                      </div>
                    )}
                  </div>
                </div>

                {/* Action */}
                {isHOD && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActionSheet(fac); }}
                    className="mobile-tappable p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Action Bottom Sheet */}
      <BottomSheet open={!!actionSheet} onClose={() => setActionSheet(null)} title={actionSheet?.name}>
        {actionSheet && (
          <div className="space-y-1">
            <a
              href={`mailto:${actionSheet.email}`}
              className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500">
                <Mail className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Send Email</span>
            </a>
            <button
              onClick={() => {
                setActionSheet(null);
                setTimeout(() => setDeleteConfirm(actionSheet), 300);
              }}
              className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">Remove Faculty</span>
            </button>
          </div>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        title="Remove Faculty"
        message={`Are you sure you want to remove ${deleteConfirm?.name}? This action cannot be undone.`}
        confirmText="Remove"
        danger
      />
    </div>
  );
}
