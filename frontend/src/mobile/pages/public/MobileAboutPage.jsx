import { Users, Target, Award, BookOpen } from "lucide-react";
import MobileCard from "../../components/MobileCard";

const STATS = [
  { icon: Users, label: "Active Users", value: "500+" },
  { icon: Target, label: "Projects", value: "120+" },
  { icon: Award, label: "Faculty", value: "30+" },
  { icon: BookOpen, label: "Classes", value: "8" },
];

export default function MobileAboutPage() {
  return (
    <div className="mobile-fade-in px-5 py-6 space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-xl font-black text-gray-900 tracking-tight mb-2">About Hive</h1>
        <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
          Hive is a comprehensive Department Project Management System designed to streamline project workflows,
          enhance faculty-student collaboration, and provide real-time insights for the Computer Science department.
        </p>
      </div>

      {/* Stats 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {STATS.map(s => {
          const Icon = s.icon;
          return (
            <MobileCard key={s.label} className="text-center">
              <Icon className="w-5 h-5 text-primary-500 mx-auto mb-2" />
              <span className="text-lg font-black text-gray-900 block">{s.value}</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</span>
            </MobileCard>
          );
        })}
      </div>

      {/* Mission */}
      <MobileCard>
        <h2 className="text-sm font-bold text-gray-900 mb-2">Our Mission</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          To provide a modern, efficient, and user-friendly platform that brings together all stakeholders
          in the department — from the Head of Department to individual students — enabling seamless
          project tracking, communication, and achievement recognition.
        </p>
      </MobileCard>

      {/* Values */}
      <MobileCard>
        <h2 className="text-sm font-bold text-gray-900 mb-3">Core Values</h2>
        <div className="space-y-3">
          {[
            { title: "Transparency", desc: "Real-time visibility into project progress and department metrics" },
            { title: "Collaboration", desc: "Seamless communication between faculty and students" },
            { title: "Excellence", desc: "Promoting accountability and high-quality project delivery" },
          ].map(v => (
            <div key={v.title} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-gray-700">{v.title}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </MobileCard>
    </div>
  );
}
