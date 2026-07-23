import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFaculty, deleteFaculty, getFacultyInvite, toggleFacultyInvite, updateFaculty,
} from "../../../api/faculty";
import { assignIncharge } from "../../../api/classes";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { Switch } from "../../../components/ui/Switch";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import MobileSearchBar from "../../components/MobileSearchBar";
import MobileCard from "../../components/MobileCard";
import MobileEmptyState from "../../components/MobileEmptyState";
import MobileSectionHeader from "../../components/MobileSectionHeader";
import BottomSheet from "../../layout/BottomSheet";
import {
  Users, Mail, GraduationCap, BookOpen,
  FolderKanban, Search, Copy, CheckCheck,
  Star, TrendingUp, MoreVertical, Trash2,
  ChevronRight, ShieldCheck, Link2, X, UserCheck, UserX,
} from "lucide-react";
import { useState, useMemo } from "react";

const CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"];

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
  const [inchargeSheet, setInchargeSheet] = useState(null);
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

  const assignInchargeMutation = useMutation({
    mutationFn: ({ id, className }) => assignIncharge(id, className),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
      setInchargeSheet(null);
      setActionSheet(null);
    },
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
      {/* HOD Registration Toggle & Invite Banner */}
      {isHOD && inviteData && (
        <div className="space-y-2">
          {/* Allow New Faculty Registration Switch */}
          <MobileCard className="!bg-white dark:!bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Allow New Faculty Registration</p>
                  <p className="text-[10px] text-gray-400">Enable self-registration via invite link</p>
                </div>
              </div>
              <Switch
                checked={!!inviteData.is_active}
                onChange={() => toggleInviteMutation.mutate()}
                loading={toggleInviteMutation.isPending}
                size="sm"
              />
            </div>
          </MobileCard>

          {/* Active Invite Link Copy Banner */}
          {inviteData.is_active && inviteData.invite_link && (
            <MobileCard className="!bg-indigo-50 dark:!bg-indigo-950/20 !border-indigo-200/60 dark:!border-indigo-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Faculty Invite Link Active</p>
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate mt-0.5">{inviteData.invite_link}</p>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="mobile-tappable p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0"
                >
                  {inviteCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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
                  <p className="text-[11px] text-gray-400 dark:text-gray-505 mt-1 truncate">{fac.email}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {fac.class_incharge_of && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        Incharge: {fac.class_incharge_of.replace("_", " ")}
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

            {isHOD && (
              <button
                onClick={() => {
                  const target = actionSheet;
                  if (target.class_incharge_of) {
                    assignInchargeMutation.mutate({ id: target.id, className: "" });
                  } else {
                    setActionSheet(null);
                    setInchargeSheet(target);
                  }
                }}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500">
                  {actionSheet.class_incharge_of ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {actionSheet.class_incharge_of ? "Remove Class Incharge" : "Assign Class Incharge"}
                </span>
              </button>
            )}

            {isHOD && (
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
            )}
          </div>
        )}
      </BottomSheet>

      {/* Assign Incharge Class Selection Bottom Sheet */}
      <BottomSheet open={!!inchargeSheet} onClose={() => setInchargeSheet(null)} title={`Assign Incharge: ${inchargeSheet?.name}`}>
        {inchargeSheet && (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-gray-400 mb-2">Select a class to assign {inchargeSheet.name} as Class Incharge:</p>
            {CLASSES.map((cls) => (
              <button
                key={cls}
                onClick={() => assignInchargeMutation.mutate({ id: inchargeSheet.id, className: cls })}
                disabled={assignInchargeMutation.isPending}
                className="mobile-tappable w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-gray-900 dark:text-white hover:border-primary-500 transition-colors"
              >
                <span>{cls.replace("_", " ")}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
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

