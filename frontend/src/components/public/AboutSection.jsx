import { GraduationCap, Users, BookOpen, Lightbulb, CheckCircle2 } from "lucide-react";

const ITEMS = [
  {
    icon:  GraduationCap,
    label: "UG and PG Programs",
    bg:    "bg-amber-50",
    color: "text-amber-500",
  },
  {
    icon:  Users,
    label: "Expert Faculty Members",
    bg:    "bg-teal-50",
    color: "text-teal-600",
  },
  {
    icon:  BookOpen,
    label: "Hands-on Project Learning",
    bg:    "bg-blue-50",
    color: "text-blue-600",
  },
  {
    icon:  Lightbulb,
    label: "Innovative & Collaborative Environment",
    bg:    "bg-violet-50",
    color: "text-violet-600",
  },
];

export function AboutSection() {
  return (
    <div
      id="about"
      className="bg-white rounded-xl border border-gray-100 shadow-card p-7 h-fit
        hover:shadow-card-hover transition-shadow duration-300"
    >
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">About Our Department</h2>
        <p className="text-sm text-gray-400 leading-relaxed mt-2">
          Empowering students and faculty through innovative project management and collaborative
          learning.
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-50 mb-5" />

      {/* Items — hover adds a gentle background highlight */}
      <ul className="space-y-1">
        {ITEMS.map(({ icon: Icon, label, bg, color }) => (
          <li
            key={label}
            className="group flex items-center gap-3 p-2.5 rounded-xl
              hover:bg-gray-50/70 transition-colors duration-150 cursor-default"
          >
            <div
              className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0
                group-hover:scale-105 transition-transform duration-200`}
            >
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <span className="text-sm text-gray-600 font-medium leading-tight">{label}</span>
          </li>
        ))}
      </ul>

      {/* Bottom accent */}
      <div className="mt-6 pt-5 border-t border-gray-50 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Accredited programs with industry-aligned curriculum
        </p>
      </div>
    </div>
  );
}
