import { useEffect, useRef } from "react";
import { HeroSection } from "../../components/public/HeroSection";
import gsap from "gsap";

export default function HomePage() {
  const pageRef = useRef(null);

  useEffect(() => {
    if (pageRef.current) {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, scale: 0.98, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.65, ease: "power2.out", clearProps: "all" }
      );
    }
  }, []);

  return (
    <div
      ref={pageRef}
      className="h-screen overflow-hidden bg-[#fbfbff] dark:bg-[#020617] transition-colors duration-300"
      style={{ opacity: 0 }}
    >
      <HeroSection />
    </div>
  );
}
