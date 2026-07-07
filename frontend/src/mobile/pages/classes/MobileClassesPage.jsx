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
  const activeMeta = meta || {
    label: c.class_name,
    level: c.class_name.startsWith("PG") ? "PG" : "UG",
    year: 1
  };

  const content = (
    <MobileCard className="space-y-[14px] !rounded-[16px] !p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Left Icon: Rounded square, 44x44, Radius: 12px, Text UG/PG 18px */}
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[18px] shrink-0">
            {activeMeta.level}
          </div>
          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h3 className="text-[16px] font-[700] leading-[22px] text-gray-900 dark:text-white truncate">
              {activeMeta.label}
            </h3>
            <p className="text-[13px] font-[500] text-[var(--text-secondary)] leading-none mt-[2px]">
              {activeMeta.level === "UG" ? "Undergraduate" : "Postgraduate"}
            </p>
          </div>
        </div>
        {c.can_view_details && (
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
        )}
      </div>

      {/* Class Incharge Info Block */}
      <div
        className="flex items-center gap-3 h-[48px] bg-[#fafafa] dark:bg-slate-900/60 rounded-[10px] p-[10px_14px] border border-slate-100/50 dark:border-slate-800/40"
      >
        {hasIncharge ? (
          <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="w-[34px] h-[34px] ring-2 ring-primary/20 shrink-0" />
        ) : (
          <div className="w-[34px] h-[34px] rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <span className="text-[10px] font-[600] tracking-[0.8px] text-[var(--text-muted)] uppercase leading-none">Class Incharge</span>
          <span className={`text-[14px] font-[600] leading-[18px] truncate mt-[2px] ${hasIncharge ? "text-gray-800 dark:text-gray-200" : "text-slate-400 dark:text-slate-500 italic"}`}>
            {hasIncharge ? c.incharge.name : "Not Assigned"}
          </span>
        </div>
      </div>

      {/* Statistics Block */}
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-2.5">
        {/* Students */}
        <div className="h-[52px] bg-[#fafafa] dark:bg-slate-900/60 border border-slate-100/50 dark:border-slate-800/40 rounded-[10px] p-2.5 flex items-center gap-[10px]">
          <Users className="w-[18px] h-[18px] text-primary shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[14px] font-bold text-gray-800 dark:text-gray-250 leading-none">{c.student_count ?? 0}</span>
            <span className="text-[10px] font-[600] tracking-[0.5px] text-[var(--text-muted)] uppercase mt-[2px] leading-none">Students</span>
          </div>
        </div>

        {/* Year / Forum Members */}
        <div className="h-[52px] bg-[#fafafa] dark:bg-slate-900/60 border border-slate-100/50 dark:border-slate-800/40 rounded-[10px] p-2.5 flex items-center gap-[10px]">
          <BookOpen className="w-[18px] h-[18px] text-primary shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[14px] font-bold text-gray-800 dark:text-gray-250 leading-none">
              {c.forum_member_count !== undefined ? c.forum_member_count : `Year ${activeMeta.year}`}
            </span>
            <span className="text-[10px] font-[600] tracking-[0.5px] text-[var(--text-muted)] uppercase mt-[2px] leading-none">
              {c.forum_member_count !== undefined ? "Forum" : "Year"}
            </span>
          </div>
        </div>
      </div>
    </MobileCard>
  );

  if (c.can_view_details) {
    return <Link to={`/classes/${c.class_name}`} className="block">{content}</Link>;
  }
  return content;
}
