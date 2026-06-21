import { ClipboardList, Users, BarChart2, Bell } from "lucide-react";
import { LoginCard } from "./LoginCard";
import { StatisticsCard } from "./StatisticsCard";

const FEATURES = [
  {
    icon:  ClipboardList,
    title: "Project Tracking",
    desc:  "Track progress in real-time",
    bg:    "bg-violet-50",
    color: "text-violet-600",
  },
  {
    icon:  Users,
    title: "Team Collaboration",
    desc:  "Work together seamlessly",
    bg:    "bg-blue-50",
    color: "text-blue-600",
  },
  {
    icon:  BarChart2,
    title: "Smart Analytics",
    desc:  "Make data-driven decisions",
    bg:    "bg-emerald-50",
    color: "text-emerald-600",
  },
  {
    icon:  Bell,
    title: "Instant Updates",
    desc:  "Stay informed always",
    bg:    "bg-orange-50",
    color: "text-orange-500",
  },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-white overflow-hidden pt-[72px]">

      {/* ── Background layer ── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <img
          src="/building.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.65] saturate-[0.9]"
        />
        {/* Solid white on the left (text), fades to transparent by the right half */}
        <div className="absolute inset-0 bg-gradient-to-r from-white from-[40%] via-white/40 via-[58%] to-transparent" />
        {/* Top fade from nav */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
        {/* Bottom fade into next section */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/90 to-transparent" />
      </div>

      {/* ── Soft ambient color blobs behind login card ── */}
      <div
        className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-primary-50/60 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 left-4 w-72 h-72 rounded-full bg-violet-50/40 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* ── Main content — extra vertical room for enterprise breathing space ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-36">
        <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_448px] gap-14 xl:gap-24 items-start">

          {/* ━━━━ LEFT: copy ━━━━ */}
          <div className="space-y-10 animate-slide-up">

            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/85 backdrop-blur-sm border border-gray-200/80 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="text-sm font-medium text-gray-600 tracking-wide">
                Collaborate • Track • Succeed
              </span>
            </div>

            {/* Headline — tighter leading for impact */}
            <div className="space-y-1">
              <h1 className="text-5xl sm:text-6xl xl:text-[68px] font-extrabold text-gray-900 leading-[1.06] tracking-[-0.02em]">
                Empowering Projects.
              </h1>
              <h1 className="text-5xl sm:text-6xl xl:text-[68px] font-extrabold leading-[1.06] tracking-[-0.02em]">
                Driving{" "}
                <span className="bg-gradient-to-r from-primary-600 via-violet-600 to-primary-500 bg-clip-text text-transparent">
                  Excellence.
                </span>
              </h1>
            </div>

            {/* Description */}
            <p className="text-[17px] text-gray-500 leading-[1.75] max-w-[480px]">
              DPMS is the central hub for managing department projects, tracking progress, and
              fostering seamless collaboration across faculty, students, and forum members.
            </p>

            {/* Feature chips — 4-col row matching the design */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-6">
              {FEATURES.map(({ icon: Icon, title, desc, bg, color }) => (
                <div
                  key={title}
                  className="group flex flex-col gap-2.5 cursor-default"
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}
                  >
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-gray-800 leading-tight">{title}</div>
                    <div className="text-[12px] text-gray-400 mt-0.5 leading-snug">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Statistics — elevated panel anchoring the left column */}
            <StatisticsCard />
          </div>

          {/* ━━━━ RIGHT: floating login card ━━━━ */}
          <div className="flex items-start justify-center lg:justify-end mt-2 lg:mt-6">
            <div className="w-full max-w-md lg:max-w-none">
              <LoginCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
