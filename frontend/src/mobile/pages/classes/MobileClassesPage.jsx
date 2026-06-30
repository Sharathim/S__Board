import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listClasses, toggleStudentRegistration } from "../../../api/classes";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Avatar } from "../../../components/ui/Avatar";
import { Users, BookOpen, ShieldCheck, Layers, ChevronRight } from "lucide-react";
import MobileCard from "../../components/MobileCard";
import MobileSectionHeader from "../../components/MobileSectionHeader";

const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A",  level: "UG", year: 1, gradient: "from-violet-500 to-purple-600"  },
  UG_1B: { label: "UG 1B", short: "1B",  level: "UG", year: 1, gradient: "from-blue-500 to-indigo-600"    },
  UG_2A: { label: "UG 2A", short: "2A",  level: "UG", year: 2, gradient: "from-pink-500 to-rose-600"      },
  UG_2B: { label: "UG 2B", short: "2B",  level: "UG", year: 2, gradient: "from-amber-500 to-orange-500"   },
  UG_3A: { label: "UG 3A", short: "3A",  level: "UG", year: 3, gradient: "from-emerald-500 to-teal-600"   },
  UG_3B: { label: "UG 3B", short: "3B",  level: "UG", year: 3, gradient: "from-cyan-500 to-sky-600"       },
  PG_1A: { label: "PG 1A", short: "PG1A",level: "PG", year: 1, gradient: "from-fuchsia-500 to-pink-600"   },
  PG_2A: { label: "PG 2A", short: "PG2A",level: "PG", year: 2, gradient: "from-indigo-500 to-blue-600"    },
};

export default function MobileClassesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();

  const { data: raw, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then(r => r.data),
  });

  const toggleRegMutation = useMutation({
    mutationFn: toggleStudentRegistration,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  const classes = raw?.classes || [];
  const regOpen = raw?.student_registration_open || false;
  const ugList = classes.filter(c => c.class_name.startsWith("UG"));
  const pgList = classes.filter(c => c.class_name.startsWith("PG"));

  return (
    <div className="space-y-5 mobile-fade-in">
      {/* Top Header/Button Row - left side free, right end button */}
      {isHOD && (
        <div className="flex justify-between items-center py-1">
          <div />
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200/60 dark:border-slate-800/80 shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => toggleRegMutation.mutate()}
              disabled={toggleRegMutation.isPending}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                regOpen
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span>+ New Student</span>
            </button>
          </div>
        </div>
      )}

      {/* UG Section */}
      {ugList.length > 0 && (
        <div>
          <MobileSectionHeader title="Undergraduate" count={ugList.length} />
          <div className="space-y-3 mt-2">
            {ugList.map(c => {
              const meta = CLASS_META[c.class_name] || { label: c.class_name, short: c.class_name.slice(-2), level: "UG", year: 1, gradient: "from-gray-500 to-gray-600" };
              return (
                <ClassCardMobile key={c.class_name} c={c} meta={meta} />
              );
            })}
          </div>
        </div>
      )}

      {/* PG Section */}
      {pgList.length > 0 && (
        <div>
          <MobileSectionHeader title="Postgraduate" count={pgList.length} />
          <div className="space-y-3 mt-2">
            {pgList.map(c => {
              const meta = CLASS_META[c.class_name] || { label: c.class_name, short: c.class_name.slice(-4), level: "PG", year: 1, gradient: "from-gray-500 to-gray-600" };
              return (
                <ClassCardMobile key={c.class_name} c={c} meta={meta} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassCardMobile({ c, meta }) {
  const hasIncharge = !!c.incharge;
  const content = (
    <MobileCard>
      <div className="flex items-start gap-3">
        {/* Colored avatar chip */}
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-md shrink-0`}>
          <span className="text-sm font-extrabold text-white">{meta.short}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{meta.label}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
              {meta.level} · Year {meta.year}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {meta.level === "UG" ? "Undergraduate Programme" : "Postgraduate Programme"}
          </p>
        </div>
      </div>

      {/* Incharge */}
      <div className={`flex items-center gap-3 p-2.5 rounded-xl border mt-3 ${
        hasIncharge
          ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/30"
          : "bg-gray-50/50 dark:bg-slate-900/30 border-dashed border-gray-200 dark:border-slate-700"
      }`}>
        {hasIncharge ? (
          <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="ring-2 ring-emerald-500/20 w-7 h-7" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
          </div>
        )}
        <div className="min-w-0">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Class Incharge</span>
          <span className={`text-xs font-bold truncate block ${hasIncharge ? "text-gray-700 dark:text-gray-200" : "text-gray-400 italic"}`}>
            {hasIncharge ? c.incharge.name : "Not assigned"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-2 rounded-xl flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <div>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{c.student_count ?? 0}</span>
            <span className="text-[9px] text-gray-400 ml-1">Students</span>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-2 rounded-xl flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <div>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{meta.year}</span>
            <span className="text-[9px] text-gray-400 ml-1">Year</span>
          </div>
        </div>
      </div>

      {/* Chevron */}
      {c.can_view_details && (
        <div className="flex justify-end mt-2">
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        </div>
      )}
    </MobileCard>
  );

  if (c.can_view_details) {
    return <Link to={`/classes/${c.class_name}`} className="block">{content}</Link>;
  }
  return content;
}
