import { Link } from "react-router-dom";
import {
  GraduationCap, Users, BookOpen, Lightbulb,
  Target, Eye, Award, TrendingUp, Code2,
  Cpu, FlaskConical, Globe2, ChevronRight,
  CheckCircle2, Zap, Shield, ArrowRight,
  BarChart2, ClipboardList, Heart, Building2,
} from "lucide-react";

const STATS = [
  { value: "500+", label: "Students Enrolled",   icon: GraduationCap, bg: "bg-violet-50",  color: "text-violet-600"  },
  { value: "30+",  label: "Expert Faculty",       icon: Users,         bg: "bg-blue-50",    color: "text-blue-600"    },
  { value: "200+", label: "Projects Completed",   icon: ClipboardList, bg: "bg-emerald-50", color: "text-emerald-600" },
  { value: "15+",  label: "Years of Excellence",  icon: Award,         bg: "bg-amber-50",   color: "text-amber-600"   },
];

const PROGRAMS = [
  {
    title:    "B.E. Computer Science & Engineering",
    duration: "4 Years",
    intake:   "120 Students",
    desc:     "A comprehensive undergraduate program covering algorithms, software engineering, AI/ML, and systems programming with strong industry internship exposure.",
    tags:     ["Algorithms", "AI / ML", "Software Eng"],
    bg:       "from-violet-50 to-indigo-50",
    border:   "border-violet-100",
    badge:    "bg-violet-100 text-violet-700",
    dot:      "bg-violet-500",
  },
  {
    title:    "M.E. Computer Science & Engineering",
    duration: "2 Years",
    intake:   "30 Students",
    desc:     "Advanced postgraduate program focused on research, specialized electives, and cutting-edge domains like cloud computing, cybersecurity, and data science.",
    tags:     ["Research", "Cloud", "Cybersecurity"],
    bg:       "from-blue-50 to-cyan-50",
    border:   "border-blue-100",
    badge:    "bg-blue-100 text-blue-700",
    dot:      "bg-blue-500",
  },
  {
    title:    "MCA — Master of Computer Applications",
    duration: "2 Years",
    intake:   "60 Students",
    desc:     "Bridges computer science theory with industry-ready full-stack application development, database systems, and enterprise software engineering.",
    tags:     ["Full Stack", "Database", "Mobile Dev"],
    bg:       "from-emerald-50 to-teal-50",
    border:   "border-emerald-100",
    badge:    "bg-emerald-100 text-emerald-700",
    dot:      "bg-emerald-500",
  },
];

const FEATURES = [
  { icon: Code2,        title: "Industry-Aligned Curriculum", desc: "Syllabi co-designed with industry partners and updated yearly to reflect current tech trends and employer expectations.", bg: "bg-violet-50",  color: "text-violet-600"  },
  { icon: Cpu,          title: "State-of-the-Art Labs",       desc: "Modern computing infrastructure, dedicated research labs, and high-performance workstations for every student.",          bg: "bg-blue-50",    color: "text-blue-600"    },
  { icon: TrendingUp,   title: "Placement Excellence",        desc: "Consistently strong placement record with top national and global companies across software, research, and product domains.", bg: "bg-emerald-50", color: "text-emerald-600" },
  { icon: Globe2,       title: "Industry Partnerships",       desc: "Active MoUs with leading tech companies enabling internships, live projects, and campus recruitment drives.",              bg: "bg-cyan-50",    color: "text-cyan-600"    },
  { icon: FlaskConical, title: "Research & Innovation",       desc: "Active research groups publishing in national and international conferences with strong funding and faculty mentorship.",    bg: "bg-amber-50",   color: "text-amber-600"   },
  { icon: BarChart2,    title: "Data-Driven Project Tracking",desc: "DPMS gives students and faculty real-time visibility into project progress, milestones, and collaborative outcomes.",       bg: "bg-rose-50",    color: "text-rose-500"    },
];

const VALUES = [
  { icon: Lightbulb, title: "Innovation",    desc: "Encouraging creative problem-solving and a culture of continuous research and exploration.",          bg: "bg-amber-50",   color: "text-amber-600"   },
  { icon: Users,     title: "Collaboration", desc: "Building strong teamwork through collaborative projects, peer learning, and cross-disciplinary work.", bg: "bg-blue-50",    color: "text-blue-600"    },
  { icon: Award,     title: "Excellence",    desc: "Upholding the highest academic and industry standards in every program, project, and interaction.",    bg: "bg-violet-50",  color: "text-violet-600"  },
  { icon: Heart,     title: "Integrity",     desc: "Fostering academic honesty, ethical responsibility, and a culture of trust across the department.",    bg: "bg-rose-50",    color: "text-rose-500"    },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO BANNER ── */}
      <section className="relative overflow-hidden pt-[72px]">
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <img
            src="/building.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-[0.55] saturate-[0.85]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white from-[35%] via-white/35 via-[58%] to-transparent" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-7 animate-fade-in">
            <Link to="/" className="hover:text-primary-600 transition-colors duration-150">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-700 font-medium">About</span>
          </nav>

          <div className="max-w-2xl animate-slide-up">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/85 backdrop-blur-sm border border-primary-100 shadow-sm mb-6">
              <Building2 className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700 tracking-wide">
                Department of Computer Science &amp; Engineering
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-[56px] font-extrabold text-gray-900 leading-[1.08] tracking-[-0.02em] mb-5">
              Shaping the Future of{" "}
              <span className="bg-gradient-to-r from-primary-600 via-violet-600 to-primary-500 bg-clip-text text-transparent">
                Technology
              </span>
            </h1>

            <p className="text-[17px] text-gray-500 leading-[1.75] max-w-[520px]">
              A department dedicated to academic excellence, innovative research, and nurturing
              the next generation of technology leaders through structured project management and collaboration.
            </p>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-[#F8F9FC] border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map(({ value, label, icon: Icon, bg, color }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-gray-100 shadow-stat p-6 flex flex-col items-center text-center hover:shadow-card-hover transition-shadow duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div className="text-[32px] font-extrabold text-gray-900 tracking-tight leading-none">{value}</div>
                <div className="text-[12px] text-gray-400 font-medium mt-1.5 leading-snug">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSION & VISION ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-semibold text-primary-600 tracking-widest uppercase mb-3">Purpose</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Our Mission &amp; Vision</h2>
            <p className="text-gray-400 text-[15px] max-w-lg mx-auto leading-relaxed">
              Guided by purpose, driven by excellence — our mission and vision define how we shape education.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Mission */}
            <div className="relative bg-white rounded-2xl border border-gray-100 shadow-card p-8 hover:shadow-card-hover transition-shadow duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary-50/70 to-transparent rounded-2xl pointer-events-none" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5">
                  <Target className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h3>
                <p className="text-gray-500 leading-relaxed text-[15px] mb-6">
                  To provide a transformative educational experience that equips students with deep technical
                  knowledge, critical thinking skills, and ethical values needed to excel in the ever-evolving
                  technology landscape.
                </p>
                <ul className="space-y-3">
                  {[
                    "Foster academic excellence and a strong research culture",
                    "Bridge theory with real-world industry practice",
                    "Develop future-ready technology professionals",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-500">
                      <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Vision */}
            <div className="relative bg-white rounded-2xl border border-gray-100 shadow-card p-8 hover:shadow-card-hover transition-shadow duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-50/70 to-transparent rounded-2xl pointer-events-none" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-5">
                  <Eye className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Our Vision</h3>
                <p className="text-gray-500 leading-relaxed text-[15px] mb-6">
                  To be a globally recognized centre of excellence in computer science education and research,
                  producing graduates who lead technological innovation and make meaningful contributions
                  to society and the profession.
                </p>
                <ul className="space-y-3">
                  {[
                    "Become a globally recognized research and education hub",
                    "Produce industry-leading technology innovators",
                    "Drive positive social impact through technology",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-500">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROGRAMS OFFERED ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F8F9FC] border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-semibold text-primary-600 tracking-widest uppercase mb-3">Academics</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Programs We Offer</h2>
            <p className="text-gray-400 text-[15px] max-w-lg mx-auto leading-relaxed">
              Comprehensive academic programs designed to meet industry demands and inspire lifelong learning.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PROGRAMS.map(({ title, duration, intake, desc, tags, bg, border, badge, dot }) => (
              <div
                key={title}
                className={`bg-gradient-to-br ${bg} rounded-2xl border ${border} p-7 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge}`}>{duration}</span>
                </div>
                <h3 className="text-[16px] font-bold text-gray-900 mb-3 leading-snug">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{desc}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{intake} per year</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium px-2.5 py-1 bg-white/70 border border-white rounded-lg text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-semibold text-primary-600 tracking-widest uppercase mb-3">Advantages</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Why Choose Our Department?</h2>
            <p className="text-gray-400 text-[15px] max-w-lg mx-auto leading-relaxed">
              We go far beyond textbooks — here's what truly sets us apart.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, bg, color }) => (
              <div
                key={title}
                className="group bg-white rounded-xl border border-gray-100 shadow-card p-6 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CORE VALUES ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F8F9FC] border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-semibold text-primary-600 tracking-widest uppercase mb-3">Values</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">Our Core Values</h2>
            <p className="text-gray-400 text-[15px] max-w-md mx-auto leading-relaxed">
              The principles that guide our teaching, research, and community every single day.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VALUES.map(({ icon: Icon, title, desc, bg, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-gray-100 shadow-stat p-7 text-center hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`w-7 h-7 ${color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCREDITATION STRIP ── */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Accredited &amp; Recognized</div>
                <div className="text-xs text-gray-400 mt-0.5">Programs accredited with industry-aligned curriculum standards</div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-3">
              {["NAAC A+", "NBA Accredited", "ISO 9001:2015", "NIRF Ranked"].map((badge) => (
                <span
                  key={badge}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700 rounded-3xl overflow-hidden shadow-login p-10 sm:p-14 text-center">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-violet-400/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-medium text-white/90">Powered by DPMS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                Ready to manage projects smarter?
              </h2>
              <p className="text-white/70 text-[15px] leading-relaxed mb-8 max-w-md mx-auto">
                DPMS unifies students, faculty, and administration — track milestones, post updates, and
                collaborate in real time, all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-primary-700 text-sm font-semibold
                    hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-lg
                    active:translate-y-0 transition-all duration-200"
                >
                  <Shield className="w-4 h-4" />
                  HOD Login
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold
                    hover:bg-white/20 hover:-translate-y-0.5
                    active:translate-y-0 transition-all duration-200 backdrop-blur-sm"
                >
                  Back to Home
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} DPMS — Department Project Management System. All rights reserved.
          </p>
          <p className="text-xs text-gray-300 tracking-wide">Built for excellence in education.</p>
        </div>
      </footer>
    </div>
  );
}
