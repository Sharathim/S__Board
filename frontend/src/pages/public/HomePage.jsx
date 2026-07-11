import { useEffect, useRef } from "react";
import { HeroSection } from "../../components/public/HeroSection";
import gsap from "gsap";

export default function HomePage() {
  const pageRef = useRef(null);

  useEffect(() => {
    if (pageRef.current) {
      gsap.set(
        pageRef.current,
        { opacity: 1, scale: 1, y: 0, clearProps: "all" }
      );
    }
  }, []);

  return (
    <div
      ref={pageRef}
      className="h-screen overflow-hidden bg-[#fbfbff] dark:bg-[#001229] transition-colors duration-300"
      style={{ opacity: 0 }}
    >
      <HeroSection />
    </div>
  );
}
