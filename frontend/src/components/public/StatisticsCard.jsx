import { Users, FolderOpen, GraduationCap, MessageCircle } from "lucide-react";

const STATS = [
  {
    icon:      Users,
    value:     "200+",
    label:     "Active Users",
    iconBg:    "bg-violet-50",
    iconColor: "text-violet-500",
  },
  {
    icon:      FolderOpen,
    value:     "50+",
    label:     "Projects",
    iconBg:    "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  {
    icon:      GraduationCap,
    value:     "8",
    label:     "Classes",
    iconBg:    "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    icon:      MessageCircle,
    value:     "15+",
    label:     "Forum Members",
    iconBg:    "bg-orange-50",
    iconColor: "text-orange-500",
  },
];

export function StatisticsCard() {
  return (
    /*
      shadow-stat provides subtle triple-layer elevation.
      bg-white/95 keeps it bright against the building background.
    */
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-stat border border-gray-100/80 px-7 py-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-0 sm:divide-x sm:divide-gray-100">
        {STATS.map(({ icon: Icon, value, label, iconBg, iconColor }) => (
          <div
            key={label}
            className="flex items-center gap-3.5 sm:px-5 sm:first:pl-0 sm:last:pr-0"
          >
            {/* Colored icon background — adds premium identity per stat */}
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <div className="text-[22px] font-extrabold text-gray-900 leading-tight tracking-tight">
                {value}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 font-medium whitespace-nowrap">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
