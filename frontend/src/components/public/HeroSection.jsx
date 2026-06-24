import { ClipboardList, Users, BarChart2, Bell } from "lucide-react";
import { LoginCard } from "./LoginCard";

const FEATURES = [
  { icon: ClipboardList, title: "Project Tracking",    desc: "Real-time progress",   bg: "bg-violet-50",  color: "text-violet-600"  },
  { icon: Users,         title: "Collaboration",       desc: "Work seamlessly",       bg: "bg-blue-50",    color: "text-blue-600"    },
  { icon: BarChart2,     title: "Smart Analytics",     desc: "Data-driven insights",  bg: "bg-emerald-50", color: "text-emerald-600" },
  { icon: Bell,          title: "Instant Updates",     desc: "Stay informed",         bg: "bg-orange-50",  color: "text-orange-500"  },
];

export function HeroSection() {
  return (
    <section className="relative h-screen bg-white overflow-hidden pt-[72px] flex items-center">

      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <img
          src="/building.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.55] saturate-[0.85]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white from-[40%] via-white/50 via-[60%] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/80 to-transparent" />
      </div>

      {/* ── Ambient blobs ── */}
      <div className="absolute top-16 right-0 w-[400px] h-[400px] rounded-full bg-primary-50/50 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-4 w-56 h-56 rounded-full bg-violet-50/40 blur-3xl pointer-events-none" aria-hidden="true" />

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px] gap-10 xl:gap-20 items-center">

          {/* ━━━━ LEFT: copy ━━━━ */}
          <div className="space-y-6 animate-slide-up">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-sm border border-gray-200/80 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="text-sm font-medium text-gray-600 tracking-wide">Collaborate • Track • Succeed</span>
            </div>

            {/* Headline */}
            <div className="space-y-0.5">
              <h1 className="text-4xl sm:text-5xl xl:text-[58px] font-extrabold text-gray-900 leading-[1.08] tracking-[-0.02em]">
                Empowering Projects.
              </h1>
              <h2 className="text-4xl sm:text-5xl xl:text-[58px] font-extrabold leading-[1.08] tracking-[-0.02em]">
                Driving{" "}
                <span className="bg-gradient-to-r from-primary-600 via-violet-600 to-primary-500 bg-clip-text text-transparent">
                  Excellence.
                </span>
              </h2>
            </div>

            {/* Description */}
            <p className="text-base text-gray-500 leading-relaxed max-w-[440px]">
              DPMS is the central hub for managing department projects, tracking progress, and
              fostering seamless collaboration across faculty, students, and forum members.
            </p>

            {/* Feature chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
              {FEATURES.map(({ icon: Icon, title, desc, bg, color }) => (
                <div key={title} className="group flex flex-col gap-2 cursor-default">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                    <Icon className={`w-4.5 h-4.5 ${color}`} />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-gray-800 leading-tight">{title}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ━━━━ RIGHT: Login card ━━━━ */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-sm">
              <LoginCard />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
