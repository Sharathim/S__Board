import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTransition } from "../../context/TransitionContext";
import { createPortal } from "react-dom";
import { listClasses, toggleStudentRegistration, assignIncharge, getStudentRegistration } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import { Switch } from "../../components/ui/Switch";
import {
  GraduationCap, Users, ToggleLeft, ToggleRight, Crown,
  Lock, ChevronRight, ChevronLeft, X, ShieldCheck, BookOpen, UserCog, Copy,
  Layers, TrendingUp, LayoutGrid, List, MoreVertical, Send, Sparkles
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

// ─── Class display metadata & Theme Palettes (Terracotta Orange Theme) ───────
const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A", level: "UG", year: 1, colorScheme: "orange", badgeBg: "bg-[#F05A2B]", ringColor: "#F05A2B", textAccent: "text-[#F05A2B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(240,90,43,0.28)] border-orange-300 dark:border-orange-800" },
  UG_1B: { label: "UG 1B", short: "1B", level: "UG", year: 1, colorScheme: "orange", badgeBg: "bg-[#F05A2B]", ringColor: "#F05A2B", textAccent: "text-[#F05A2B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(240,90,43,0.28)] border-orange-300 dark:border-orange-800" },
  UG_2A: { label: "UG 2A", short: "2A", level: "UG", year: 2, colorScheme: "terracotta", badgeBg: "bg-[#E04A1B]", ringColor: "#E04A1B", textAccent: "text-[#E04A1B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(224,74,27,0.28)] border-orange-300 dark:border-orange-800" },
  UG_2B: { label: "UG 2B", short: "2B", level: "UG", year: 2, colorScheme: "terracotta", badgeBg: "bg-[#E04A1B]", ringColor: "#E04A1B", textAccent: "text-[#E04A1B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(224,74,27,0.28)] border-orange-300 dark:border-orange-800" },
  UG_3A: { label: "UG 3A", short: "3A", level: "UG", year: 3, colorScheme: "coral", badgeBg: "bg-[#FF8365]", ringColor: "#FF8365", textAccent: "text-[#E04A1B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(255,131,101,0.28)] border-orange-300 dark:border-orange-800" },
  UG_3B: { label: "UG 3B", short: "3B", level: "UG", year: 3, colorScheme: "coral", badgeBg: "bg-[#FF8365]", ringColor: "#FF8365", textAccent: "text-[#E04A1B]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(255,131,101,0.28)] border-orange-300 dark:border-orange-800" },
  PG_1A: { label: "PG 1A", short: "PG1A", level: "PG", year: 1, colorScheme: "rose", badgeBg: "bg-[#B83610]", ringColor: "#B83610", textAccent: "text-[#B83610]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(184,54,16,0.28)] border-orange-300 dark:border-orange-800" },
  PG_2A: { label: "PG 2A", short: "PG2A", level: "PG", year: 2, colorScheme: "rose", badgeBg: "bg-[#B83610]", ringColor: "#B83610", textAccent: "text-[#B83610]", inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20", glowShadow: "shadow-[0_25px_60px_rgba(184,54,16,0.28)] border-orange-300 dark:border-orange-800" },
};

function StudentRegistrationBanner() {
  return null;
}

// ─── Standard Mobile & Grid Card Component ──────────────────────────────────
function ClassCard({ c, meta, isHOD, onAssignIncharge, onNavigate }) {
  const hasIncharge = !!c.incharge;
  const activeMeta = meta || {
    label: c.class_name,
    level: c.class_name.startsWith("PG") ? "PG" : "UG",
    year: 1
  };

  const cardContent = (
    <div className={`group class-card-redesign mx-auto ${
      c.can_view_details ? "cursor-pointer" : "opacity-80 cursor-default"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#FF8365] to-[#F05A2B] flex items-center justify-center text-white font-bold text-[18px] shrink-0 shadow-md shadow-orange-500/20">
            {activeMeta.level}
          </div>
          <div className="min-w-0">
            <h3 className="text-[16px] font-[700] leading-[22px] text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
              {activeMeta.label}
            </h3>
            <p className="text-[13px] font-[500] text-[var(--text-secondary)] leading-none mt-[2px]">
              {activeMeta.level === "UG" ? "Undergraduate" : "Postgraduate"}
            </p>
          </div>
        </div>
        {c.can_view_details && (
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
        )}
      </div>

      {/* Class Incharge Info Block */}
      <div
        onClick={(e) => {
          if (isHOD) {
            e.preventDefault();
            e.stopPropagation();
            onAssignIncharge(c.class_name);
          }
        }}
        className={`flex items-center gap-3 h-[48px] bg-[#fafafa] dark:bg-slate-950 rounded-[10px] p-[10px_14px] border border-slate-100/50 dark:border-slate-700 transition-all ${
          isHOD
            ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700/80"
            : ""
        }`}
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
        <div className="h-[52px] bg-[#fafafa] dark:bg-slate-950 border border-slate-100/50 dark:border-slate-700 rounded-[10px] p-2.5 flex items-center gap-[10px]">
          <Users className="w-[18px] h-[18px] text-primary shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[14px] font-bold text-gray-800 dark:text-gray-250 leading-none">{c.student_count ?? 0}</span>
            <span className="text-[10px] font-[600] tracking-[0.5px] text-[var(--text-muted)] uppercase mt-[2px] leading-none">Students</span>
          </div>
        </div>
 
        <div className="h-[52px] bg-[#fafafa] dark:bg-slate-950 border border-slate-100/50 dark:border-slate-700 rounded-[10px] p-2.5 flex items-center gap-[10px]">
          <BookOpen className="w-[18px] h-[18px] text-primary shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[14px] font-bold text-gray-800 dark:text-gray-250 leading-none">
              {`Year ${activeMeta.year}`}
            </span>
            <span className="text-[10px] font-[600] tracking-[0.5px] text-[var(--text-muted)] uppercase mt-[2px] leading-none">
              Year
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (c.can_view_details) {
    const meta = CLASS_META[c.class_name];
    return (
      <div 
        onClick={() => onNavigate(`/classes/${c.class_name}`, meta?.label || c.class_name, BookOpen)} 
        className="block cursor-pointer"
      >
        {cardContent}
      </div>
    );
  }
  return cardContent;
}

// ─── 3D Image 1 Replicated Class Card Component ─────────────────────────────
function Coverflow3DClassCard({ c, meta, isHOD, onAssignIncharge, onNavigate, isActive, onClickCard }) {
  const hasIncharge = !!c.incharge;
  const activeMeta = meta || {
    label: c.class_name,
    level: c.class_name.startsWith("PG") ? "PG" : "UG",
    year: 1,
    badgeBg: "bg-[#F05A2B]",
    ringColor: "#F05A2B",
    textAccent: "text-[#F05A2B]",
    inchargeBg: "bg-[#FFF5F2] dark:bg-orange-950/20",
    glowShadow: "shadow-[0_25px_60px_rgba(240,90,43,0.28)]"
  };

  const ringStroke = activeMeta.ringColor || "#F05A2B";
  const badgeColor = activeMeta.badgeBg || "bg-[#F05A2B]";
  const textAccentColor = activeMeta.textAccent || "text-[#F05A2B]";

  return (
    <div 
      onClick={(e) => {
        if (!isActive) {
          e.preventDefault();
          e.stopPropagation();
          onClickCard();
        } else if (c.can_view_details) {
          onNavigate(`/classes/${c.class_name}`, activeMeta.label || c.class_name, BookOpen);
        }
      }}
      className={`w-[310px] h-[395px] p-6 flex flex-col justify-between select-none relative cursor-pointer rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 transition-all duration-300 ${
        isActive 
          ? `coverflow-card-active ${activeMeta.glowShadow || "shadow-2xl"} ring-2 ring-[#F05A2B]/40 border-orange-200 dark:border-orange-900/60` 
          : "shadow-md hover:shadow-lg opacity-90 hover:opacity-100"
      }`}
    >
      {/* 1. Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-[42px] h-[42px] rounded-[14px] ${badgeColor} flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/20 shrink-0`}>
            {activeMeta.level}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">
              {activeMeta.label}
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-0.5">
              {activeMeta.level === "UG" ? "Undergraduate" : "Postgraduate"}
            </p>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (c.can_view_details) {
              onNavigate(`/classes/${c.class_name}`, activeMeta.label || c.class_name, BookOpen);
            }
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Center Circular Gauge Graphic & Precise Typography */}
      <div className="my-2 flex items-center justify-between px-1 relative">
        {/* Left Side: Students Count */}
        <div className="flex flex-col items-center justify-center text-center w-[64px]">
          <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
            {c.student_count ?? 0}
          </span>
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 tracking-[0.14em] uppercase mt-2">
            STUDENTS
          </span>
        </div>

        {/* Center Multi-Layer Translucent Ring Gauge */}
        <div className="relative w-32 h-32 rounded-full bg-[#FFF5F2] dark:bg-orange-950/30 border border-orange-100/60 dark:border-orange-900/40 p-2 flex items-center justify-center shadow-inner shrink-0">
          {/* SVG Progress Arc */}
          <svg className="w-full h-full transform -rotate-90 drop-shadow-xs relative z-10" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="38"
              stroke="rgba(240, 90, 43, 0.12)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              stroke={ringStroke}
              strokeWidth="7"
              strokeDasharray="238.7"
              strokeDashoffset="65"
              strokeLinecap="round"
              className="transition-all duration-700"
              fill="transparent"
            />
          </svg>

          {/* Inner White Gap Ring & Center Solid Icon Badge */}
          <div className="absolute inset-0 m-auto w-[56px] h-[56px] rounded-full bg-white dark:bg-slate-900 p-1 shadow-md z-20 flex items-center justify-center">
            <div className={`w-full h-full rounded-full ${badgeColor} text-white flex items-center justify-center shadow-md shadow-orange-500/20 transform transition-transform duration-300 ${isActive ? "scale-105" : ""}`}>
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Right Side: Stacked "Year" / "2" & "YEAR" Label */}
        <div className="flex flex-col items-center justify-center text-center w-[64px]">
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Year</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{activeMeta.year}</span>
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 tracking-[0.14em] uppercase mt-2">
            YEAR
          </span>
        </div>
      </div>

      {/* 3. Bottom Class Incharge Info Pill Box */}
      <div
        onClick={(e) => {
          if (isHOD) {
            e.stopPropagation();
            onAssignIncharge(c.class_name);
          }
        }}
        className={`flex items-center gap-3.5 h-13 ${activeMeta.inchargeBg || "bg-[#FFF5F2] dark:bg-orange-950/20"} rounded-[18px] px-4 border border-slate-100 dark:border-slate-800/80 transition-all ${
          isHOD ? "cursor-pointer hover:brightness-95" : ""
        }`}
      >
        {hasIncharge ? (
          <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="w-7.5 h-7.5 ring-2 ring-orange-500/20 shrink-0" />
        ) : (
          <div className="w-7.5 h-7.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-[#F05A2B] shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase leading-none">Class Incharge</span>
          <span className={`text-xs font-black leading-tight truncate mt-0.5 ${hasIncharge ? "text-slate-900 dark:text-slate-100" : `${textAccentColor} italic font-bold`}`}>
            {hasIncharge ? c.incharge.name : "Not Assigned"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 3D Coverflow Carousel Container (GSAP Powered) ───────────────────────
function CoverflowCarousel({ list, isHOD, onAssignIncharge, onNavigate, initialClassIndex = 0 }) {
  const [activeIndex, setActiveIndex] = useState(initialClassIndex);
  const containerRef = useRef(null);
  const cardsRef = useRef([]);
  const prevActiveIndexRef = useRef(initialClassIndex);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const dragDistance = useRef(0);

  // Set initial activeIndex to UG 1A when list loads
  useEffect(() => {
    if (initialClassIndex >= 0 && initialClassIndex < list.length) {
      setActiveIndex(initialClassIndex);
    }
  }, [initialClassIndex, list.length]);

  // Synchronize activeIndex if list size changes
  useEffect(() => {
    if (activeIndex >= list.length) {
      setActiveIndex(Math.max(0, list.length - 1));
    }
  }, [list.length, activeIndex]);

  // GSAP 3D Coverflow animation effect with clean wrap-around suppression
  useEffect(() => {
    if (!list.length) return;
    const n = list.length;
    const prevActiveIndex = prevActiveIndexRef.current;
    prevActiveIndexRef.current = activeIndex;

    list.forEach((_, i) => {
      const card = cardsRef.current[i];
      if (!card) return;

      // Current shortest distance in modulo n
      let diff = i - activeIndex;
      if (n > 1) {
        diff = ((diff % n) + n) % n;
        if (diff > n / 2) diff -= n;
      }

      // Previous shortest distance in modulo n
      let prevDiff = i - prevActiveIndex;
      if (n > 1) {
        prevDiff = ((prevDiff % n) + n) % n;
        if (prevDiff > n / 2) prevDiff -= n;
      }

      const absDiff = Math.abs(diff);
      const isVisible = absDiff <= 2;

      const spacing = 320;
      const xPos = diff * spacing;
      const rotateYVal = diff === 0 ? 0 : diff < 0 ? 18 : -18;
      const scaleVal = diff === 0 ? 1.08 : Math.max(0.76, 0.86 - absDiff * 0.05);
      const opacityVal = diff === 0 ? 1 : absDiff === 1 ? 0.88 : absDiff === 2 ? 0.55 : 0;
      const zVal = diff === 0 ? 80 : -absDiff * 50;
      const zIndexVal = 100 - absDiff * 10;

      // Detect wrap-around flip (e.g., card moved from leftmost to rightmost or vice versa)
      const didWrapAround = (diff > 0 && prevDiff < 0) || (diff < 0 && prevDiff > 0);

      if (didWrapAround || !isVisible) {
        // Instantly position without animation so card doesn't fly across screen
        gsap.set(card, {
          x: xPos,
          rotateY: rotateYVal,
          scale: scaleVal,
          opacity: isVisible ? opacityVal : 0,
          z: zVal,
          zIndex: zIndexVal,
          display: isVisible ? "block" : "none"
        });
      } else {
        gsap.to(card, {
          x: xPos,
          rotateY: rotateYVal,
          scale: scaleVal,
          opacity: opacityVal,
          z: zVal,
          zIndex: zIndexVal,
          display: "block",
          duration: 0.45,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
    });
  }, [activeIndex, list]);

  const handleNext = () => {
    if (list.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % list.length);
  };

  const handlePrev = () => {
    if (list.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  // Pointer drag gestures
  const onPointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.clientX || e.touches?.[0]?.clientX || 0;
    dragDistance.current = 0;
  };

  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    const currentX = e.clientX || e.touches?.[0]?.clientX || 0;
    dragDistance.current = currentX - startX.current;
  };

  const onPointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragDistance.current < -40) {
      handleNext();
    } else if (dragDistance.current > 40) {
      handlePrev();
    }
  };

  if (!list.length) return null;

  return (
    <div className="w-full py-4 flex flex-col items-center select-none relative overflow-hidden">
      
      {/* 3D Coverflow Stage Area */}
      <div 
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="relative w-full h-[420px] sm:h-[450px] flex items-center justify-center coverflow-stage cursor-grab active:cursor-grabbing overflow-visible"
      >
        {/* Floor Glow Reflection */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-20 rounded-full coverflow-floor-reflection pointer-events-none opacity-60" />

        {/* Floating Left / Right Nav Arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-2 lg:left-8 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-md backdrop-blur-md hover:scale-110 active:scale-95 transition-all"
          title="Previous Class"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-2 lg:right-8 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-md backdrop-blur-md hover:scale-110 active:scale-95 transition-all"
          title="Next Class"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Render Cards */}
        {list.map((c, i) => {
          const meta = CLASS_META[c.class_name];
          return (
            <div
              key={c.class_name}
              ref={(el) => (cardsRef.current[i] = el)}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <Coverflow3DClassCard
                c={c}
                meta={meta}
                isHOD={isHOD}
                onAssignIncharge={onAssignIncharge}
                onNavigate={onNavigate}
                isActive={i === activeIndex}
                onClickCard={() => setActiveIndex(i)}
              />
            </div>
          );
        })}
      </div>

      {/* Pagination Dots Indicator Bar */}
      <div className="flex items-center gap-2 mt-2 z-20">
        {list.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`transition-all duration-300 rounded-full ${
              i === activeIndex 
                ? "w-7 h-2 bg-[#F05A2B] dark:bg-[#FF8365] shadow-md shadow-orange-500/30" 
                : "w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>

      {/* Decorative Paper Plane Helper Subtitle */}
      <div className="flex items-center justify-center gap-2 mt-4 text-slate-400 dark:text-slate-500 text-xs font-semibold tracking-wide">
        <Send className="w-3.5 h-3.5 text-[#F05A2B] transform -rotate-12 animate-pulse" />
        <span>Click on any class to view details</span>
      </div>
    </div>
  );
}

// ─── Assign Incharge Modal ────────────────────────────────────────────────────
function AssignInchargeModal({ className, eligibleFaculty, onAssign, onClose, isPending }) {
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  if (!className) return null;
  const meta = CLASS_META[className];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-4 pt-16 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[78vh] flex flex-col overflow-hidden transition-all shadow-[0_25px_80px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="h-1.5 rounded-t-3xl bg-gradient-to-r from-[#FF8365] via-[#F05A2B] to-[#E04A1B] shrink-0" />
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF8365] to-[#F05A2B] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">Assign Incharge</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 mt-0.5">{meta?.label || className} class</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Faculty list */}
        <div className="p-4 flex-1 overflow-y-auto min-h-0 space-y-2">
          {eligibleFaculty.length === 0 ? (
            <div className="text-center py-10">
              <UserCog className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No eligible faculty</p>
              <p className="text-xs font-medium text-slate-400 mt-1">All faculty are already assigned as class incharge.</p>
            </div>
          ) : (
            eligibleFaculty.map((f) => {
              const isSelected = selectedFacultyId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFacultyId(f.id)}
                  disabled={isPending}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left disabled:opacity-50 group cursor-pointer ${
                    isSelected
                      ? "border-[#F05A2B] bg-[#FFF5F2] dark:bg-orange-950/40 shadow-sm shadow-orange-500/10 ring-1 ring-[#F05A2B]/30"
                      : "border-slate-100 dark:border-slate-800/80 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50/30 dark:hover:bg-orange-950/20"
                  }`}
                >
                  <Avatar src={f.profile_picture} name={f.name} size="sm" className="w-9 h-9 ring-2 ring-orange-500/20 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#F05A2B] dark:group-hover:text-[#FF8365] transition-colors">{f.name}</p>
                    <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">{f.designation}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? "border-[#F05A2B] bg-[#F05A2B] text-white" : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedFacultyId || isPending}
            onClick={() => onAssign({ className, facultyId: selectedFacultyId })}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF8365] via-[#F05A2B] to-[#E04A1B] hover:brightness-110 text-white disabled:opacity-50 text-xs font-black transition-all shadow-md shadow-orange-500/25 active:scale-95"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Classes Page ────────────────────────────────────────────────────────
export default function ClassesPage() {
  const { user } = useAuth();
  const isHOD = user?.role === "HOD";
  const queryClient = useQueryClient();
  const { navigateWithTransition } = usePageTransition();

  const [inchargeModal, setInchargeModal] = useState(null);
  const [viewMode, setViewMode] = useState("coverflow"); // Default to 3D Coverflow on desktop

  const { data: raw, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then((r) => r.data),
  });

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
    enabled: isHOD,
  });

  const toggleRegMutation = useMutation({
    mutationFn: toggleStudentRegistration,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });

  const assignInchargeMutation = useMutation({
    mutationFn: ({ className, facultyId }) => assignIncharge(className, facultyId),
    onSuccess: () => {
      setInchargeModal(null);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
    },
  });

  if (isLoading) return <Spinner />;

  const classes = raw?.classes || [];
  const regOpen = raw?.student_registration_open || false;
  const facultyList = facultyData || [];
  const eligibleFaculty = facultyList.filter((f) => !f.class_incharge_of);

  const ugList = classes.filter((c) => c.class_name.startsWith("UG"));
  const pgList = classes.filter((c) => c.class_name.startsWith("PG"));
  const allClasses = [...pgList, ...ugList];

  return (
    <div className="space-y-4 animate-fade-in pb-8">

      {/* ── Page Header ── */}
      <div className="flex flex-row items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Classes</h1>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-[#FFF5F2] dark:bg-orange-950/40 text-[#F05A2B] border border-orange-200/50 dark:border-orange-900/40">
            {allClasses.length} Classes Total
          </span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Forum button */}
          <button
            onClick={() => setShowForumRoster(true)}
            className="inline-flex items-center gap-2 px-3.5 h-9 rounded-xl border border-gray-200/60 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-755 dark:text-gray-200 text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#F05A2B]" />
            <span>Forum</span>
          </button>

          {isHOD && (
            <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 px-3 h-9 rounded-xl border border-gray-200/60 dark:border-gray-700 shadow-sm shrink-0">
              <span className="text-xs font-bold text-gray-550 dark:text-gray-400">New Student</span>
              <Switch
                checked={regOpen}
                onChange={() => toggleRegMutation.mutate()}
                loading={toggleRegMutation.isPending}
                size="sm"
              />
            </div>
          )}

          {/* Desktop View Switchers */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-gray-150 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 h-9 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-700 text-[#F05A2B] dark:text-[#FF8365] shadow-sm"
                  : "text-gray-455 dark:text-gray-500 hover:text-gray-650"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-700 text-[#F05A2B] dark:text-[#FF8365] shadow-sm"
                  : "text-gray-455 dark:text-gray-500 hover:text-gray-655"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CLASSES GRID/LIST VIEWS
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="block">
        {viewMode !== "list" ? (
          <>
            {/* UG Classes */}
            {ugList.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-400 dark:text-gray-550 uppercase tracking-widest">Undergraduate ({ugList.length} classes)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {ugList.map((c) => (
                    <ClassCard
                      key={c.class_name}
                      c={c}
                      meta={CLASS_META[c.class_name]}
                      isHOD={isHOD}
                      onAssignIncharge={setInchargeModal}
                      onNavigate={navigateWithTransition}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* PG Classes */}
            {pgList.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-400 dark:text-gray-550 uppercase tracking-widest">Postgraduate ({pgList.length} classes)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {pgList.map((c) => (
                    <ClassCard
                      key={c.class_name}
                      c={c}
                      meta={CLASS_META[c.class_name]}
                      isHOD={isHOD}
                      onAssignIncharge={setInchargeModal}
                      onNavigate={navigateWithTransition}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* List View */
          <div className="space-y-4">
            <div className="hidden lg:grid grid-cols-[minmax(180px,1.5fr)_1fr_1.5fr_1fr_120px] gap-4 px-6 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider border-b border-gray-150 dark:border-gray-800/40">
              <span>Class Name</span>
              <span>Level</span>
              <span>Class Incharge</span>
              <span className="text-center">Students</span>
              <span className="text-right">Action</span>
            </div>
            <div className="space-y-2.5">
              {classes.map((c) => {
                const meta = CLASS_META[c.class_name];
                const hasIncharge = !!c.incharge;
                return (
                  <div
                    key={c.class_name}
                    onClick={() => c.can_view_details && navigateWithTransition(`/classes/${c.class_name}`, meta?.label || c.class_name, BookOpen)}
                    className={`group grid grid-cols-1 lg:grid-cols-[minmax(180px,1.5fr)_1fr_1.5fr_1fr_120px] gap-4 items-center p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-150 dark:border-gray-700/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(99,102,241,0.06)] hover:-translate-y-0.5 hover:border-indigo-500/20 transition-all duration-300 ${
                      c.can_view_details ? "cursor-pointer" : "opacity-80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-55 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                        {meta?.short || c.class_name}
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{meta?.label || c.class_name}</span>
                    </div>

                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {meta?.level === "UG" ? "Undergraduate" : "Postgraduate"}
                    </span>

                    <div className="flex items-center gap-2">
                      {hasIncharge ? (
                        <>
                          <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="w-6.5 h-6.5 ring-2 ring-primary/10 shrink-0" />
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-250 truncate">{c.incharge.name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not Assigned</span>
                      )}
                    </div>

                    <span className="text-xs font-bold text-gray-700 dark:text-gray-350 text-center">
                      {c.student_count ?? 0} Students
                    </span>

                    <div className="text-right" onClick={(e) => e.stopPropagation()}>
                      {isHOD ? (
                        <button
                          onClick={() => setInchargeModal(c.class_name)}
                          className="text-xs font-bold text-indigo-600 hover:text-[#F05A2B] hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 transition-all active:scale-95"
                        >
                          Assign Incharge
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Assign Incharge Modal ── */}
      <AssignInchargeModal
        className={inchargeModal}
        eligibleFaculty={eligibleFaculty}
        onAssign={(payload) => assignInchargeMutation.mutate(payload)}
        onClose={() => setInchargeModal(null)}
        isPending={assignInchargeMutation.isPending}
      />

      {/* ── Forum Directory Modal ── */}
      <Modal open={showForumRoster} onClose={() => setShowForumRoster(false)} title="Forum Directory" size="lg">
        <div className="space-y-5 pt-1">
          {/* Header of roster space inside modal */}
          <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
            <span className="text-xs font-extrabold text-gray-400 dark:text-gray-555 uppercase tracking-widest">
              {forumMembers?.length || 0} Members Total
            </span>
            {isHOD && (
              <button
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF5F2] dark:bg-orange-950/40 text-[#F05A2B] border border-orange-200/50 dark:border-orange-900/40 text-xs font-extrabold transition-all shadow-xs hover:bg-[#FFEAE5] active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
            {forumMembersLoading ? (
              <div className="col-span-2 text-center py-8">
                <Spinner />
              </div>
            ) : !forumMembers || forumMembers.length === 0 ? (
              <div className="col-span-2 text-center py-10">
                <p className="text-xs text-gray-450 italic">No forum members appointed yet.</p>
              </div>
            ) : (
              forumMembers.map((m) => {
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-gray-150 dark:border-gray-700/65 shadow-xs hover:border-orange-300 dark:hover:border-orange-900/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={m.profile_picture} name={m.name} size="sm" className="ring-2 ring-orange-500/10 shrink-0" />
                      <div className="min-w-0 leading-tight">
                        <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{m.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-[#F05A2B] border border-orange-100/30 dark:border-orange-900/20">
                            {m.role}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-305">
                            {m.class_name?.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isHOD && (
                      <button
                        onClick={() => setDeleteForumMemberTarget(m)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shrink-0 cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* ── Add Member Picker ── */}
      <SearchPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add Forum Member"
        queryKey="eligible-students"
        fetchFn={(search) => listEligibleStudents(search).then(r => r.data.students)}
        onPick={(student) => { setPendingStudent(student); setPickerOpen(false); }}
        placeholder="Search students by name, email, roll…"
        emptyText="No eligible students found."
      />

      {/* ── Role Selection Modal ── */}
      {pendingStudent && (
        <Modal open={!!pendingStudent} onClose={() => setPendingStudent(null)} title="Assign Forum Role">
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-55 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-950/30 rounded-2xl border border-orange-200/30 dark:border-orange-900/30">
              <Avatar src={pendingStudent.profile_picture} name={pendingStudent.name} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{pendingStudent.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {pendingStudent.class_name?.replace("_", " ")} · {pendingStudent.email}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Select Preset Role</label>
              <select
                value={rolePreset}
                onChange={(e) => {
                  setRolePreset(e.target.value);
                  if (e.target.value !== "Custom") {
                    setCustomRole("");
                  }
                }}
                className="w-full p-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20"
              >
                <option value="President">President</option>
                <option value="Vice President">Vice President</option>
                <option value="Secretary">Secretary</option>
                <option value="Joint Secretary">Joint Secretary</option>
                <option value="Media Secretary">Media Secretary</option>
                <option value="Technical Head">Technical Head</option>
                <option value="Technical Coordinator">Technical Coordinator</option>
                <option value="Cultural Secretary">Cultural Secretary</option>
                <option value="Sports Secretary">Sports Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Executive Member">Executive Member</option>
                <option value="Discipline Coordinator">Discipline Coordinator</option>
                <option value="Placement Coordinator">Placement Coordinator</option>
                <option value="Custom">Custom Role...</option>
              </select>
            </div>

            {rolePreset === "Custom" && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest mb-2">Custom Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Vice Secretary, Creative Head"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/20"
                />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPendingStudent(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-250 dark:border-gray-755 text-sm font-semibold text-gray-650 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalRole = rolePreset === "Custom" ? customRole.trim() : rolePreset;
                  if (!finalRole) {
                    showError("Please enter a custom designation.");
                    return;
                  }
                  assignForumMemberMutation.mutate({ studentId: pendingStudent.id, role: finalRole });
                }}
                disabled={assignForumMemberMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8365] to-[#F05A2B] hover:brightness-110 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60"
              >
                {assignForumMemberMutation.isPending ? "Adding…" : `Add as ${rolePreset === "Custom" && customRole ? customRole : rolePreset}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Remove Member Confirmation ── */}
      <ConfirmDialog
        open={!!deleteForumMemberTarget}
        onClose={() => setDeleteForumMemberTarget(null)}
        onConfirm={() => removeForumMemberMutation.mutate(deleteForumMemberTarget.id)}
        title="Remove Forum Member"
        message={`Are you sure you want to remove ${deleteForumMemberTarget?.name} from the forum members?`}
        confirmText={removeForumMemberMutation.isPending ? "Removing..." : "Remove"}
        danger
      />

      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-2xl shadow-emerald-500/30 border border-emerald-400/20 animate-slide-in">
          <span className="text-sm font-bold">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-2xl shadow-red-500/30 border border-red-400/20 animate-slide-in">
          <span className="text-sm font-bold">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
