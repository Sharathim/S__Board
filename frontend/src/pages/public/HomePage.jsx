import { HeroSection } from "../../components/public/HeroSection";
import { AnnouncementSection } from "../../components/public/AnnouncementSection";
import { AboutSection } from "../../components/public/AboutSection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── building background + split layout */}
      <HeroSection />

      {/* ── ANNOUNCEMENTS + ABOUT ──
          Distinct section boundary via subtle background shift + top border.
          Inner shadow at the top edge gives depth separation from the hero. */}
      <section
        id="updates"
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-[#F8F9FC] border-t border-gray-100"
      >
        {/* Soft top-shadow divider between hero and this section */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] gap-10 xl:gap-16 items-start">
            <AnnouncementSection />
            <AboutSection />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} DPMS — Department Project Management System.
            All rights reserved.
          </p>
          <p className="text-xs text-gray-300 tracking-wide">Built for excellence in education.</p>
        </div>
      </footer>
    </div>
  );
}
