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

// ─── Class display metadata & Theme Palettes ─────────────────────────────
const CLASS_META = {
  UG_1A: { label: "UG 1A", short: "1A", level: "UG", year: 1, colorScheme: "purple", badgeBg: "bg-[#7C3AED]", ringColor: "#8B5CF6", textAccent: "text-[#7C3AED]", inchargeBg: "bg-[#F5F3FF] dark:bg-purple-950/30", glowShadow: "shadow-[0_20px_50px_rgba(124,58,237,0.22)] border-purple-300 dark:border-purple-800" },
  UG_1B: { label: "UG 1B", short: "1B", level: "UG", year: 1, colorScheme: "purple", badgeBg: "bg-[#7C3AED]", ringColor: "#8B5CF6", textAccent: "text-[#7C3AED]", inchargeBg: "bg-[#F5F3FF] dark:bg-purple-950/30", glowShadow: "shadow-[0_20px_50px_rgba(124,58,237,0.22)] border-purple-300 dark:border-purple-800" },
  UG_2A: { label: "UG 2A", short: "2A", level: "UG", year: 2, colorScheme: "indigo", badgeBg: "bg-[#4F46E5]", ringColor: "#6366F1", textAccent: "text-[#4F46E5]", inchargeBg: "bg-[#EEF2FF] dark:bg-indigo-950/30", glowShadow: "shadow-[0_20px_50px_rgba(99,102,241,0.25)] border-indigo-300 dark:border-indigo-800" },
  UG_2B: { label: "UG 2B", short: "2B", level: "UG", year: 2, colorScheme: "indigo", badgeBg: "bg-[#4F46E5]", ringColor: "#6366F1", textAccent: "text-[#4F46E5]", inchargeBg: "bg-[#EEF2FF] dark:bg-indigo-950/30", glowShadow: "shadow-[0_20px_50px_rgba(99,102,241,0.25)] border-indigo-300 dark:border-indigo-800" },
  UG_3A: { label: "UG 3A", short: "3A", level: "UG", year: 3, colorScheme: "emerald", badgeBg: "bg-[#10B981]", ringColor: "#10B981", textAccent: "text-[#059669]", inchargeBg: "bg-[#ECFDF5] dark:bg-emerald-950/30", glowShadow: "shadow-[0_20px_50px_rgba(16,185,129,0.22)] border-emerald-300 dark:border-emerald-800" },
  UG_3B: { label: "UG 3B", short: "3B", level: "UG", year: 3, colorScheme: "emerald", badgeBg: "bg-[#10B981]", ringColor: "#10B981", textAccent: "text-[#059669]", inchargeBg: "bg-[#ECFDF5] dark:bg-emerald-950/30", glowShadow: "shadow-[0_20px_50px_rgba(16,185,129,0.22)] border-emerald-300 dark:border-emerald-800" },
  PG_1A: { label: "PG 1A", short: "PG1A", level: "PG", year: 1, colorScheme: "fuchsia", badgeBg: "bg-[#D946EF]", ringColor: "#E879F9", textAccent: "text-[#C026D3]", inchargeBg: "bg-[#FDF4FF] dark:bg-fuchsia-950/30", glowShadow: "shadow-[0_20px_50px_rgba(217,70,239,0.22)] border-fuchsia-300 dark:border-fuchsia-800" },
  PG_2A: { label: "PG 2A", short: "PG2A", level: "PG", year: 2, colorScheme: "indigo", badgeBg: "bg-[#4F46E5]", ringColor: "#6366F1", textAccent: "text-[#4F46E5]", inchargeBg: "bg-[#EEF2FF] dark:bg-indigo-950/30", glowShadow: "shadow-[0_20px_50px_rgba(99,102,241,0.25)] border-indigo-300 dark:border-indigo-800" },
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
          <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[18px] shrink-0 shadow-md shadow-indigo-500/20">
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
    badgeBg: "bg-[#7C5CFC]",
    ringColor: "#7C5CFC",
    textAccent: "text-[#7C5CFC]",
    inchargeBg: "bg-[#F7F6FF] dark:bg-purple-950/20",
    glowShadow: "shadow-[0_22px_55px_rgba(124,92,252,0.22)]"
  };

  const ringStroke = activeMeta.ringColor || "#7C5CFC";
  const badgeColor = activeMeta.badgeBg || "bg-[#7C5CFC]";
  const textAccentColor = activeMeta.textAccent || "text-[#7C5CFC]";

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
      className={`w-[305px] h-[390px] p-6 flex flex-col justify-between select-none relative cursor-pointer rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 transition-all duration-300 ${
        isActive 
          ? `coverflow-card-active ${activeMeta.glowShadow || "shadow-2xl"} ring-2 ring-purple-400/40 border-purple-200 dark:border-purple-800/60` 
          : "shadow-md hover:shadow-lg opacity-90 hover:opacity-100"
      }`}
    >
      {/* 1. Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-[42px] h-[42px] rounded-[14px] ${badgeColor} flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-purple-500/20 shrink-0`}>
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

      {/* 2. Center Multi-Ring Circular Gauge & Statistics */}
      <div className="my-2 flex items-center justify-between px-1 relative">
        {/* Left Side: Student Count */}
        <div className="flex flex-col items-center justify-center text-center w-[62px]">
          <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
            {c.student_count ?? 0}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
            Students
          </span>
        </div>

        {/* Center Multi-Layer Translucent Ring Halo */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-purple-100/50 via-purple-50/20 to-indigo-100/40 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200/50 dark:border-purple-800/40 p-2 flex items-center justify-center shadow-inner shrink-0">
          
          {/* SVG Progress Arc */}
          <svg className="w-full h-full transform -rotate-90 drop-shadow-xs" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="6"
              className="text-purple-100/80 dark:text-purple-950/60"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke={ringStroke}
              strokeWidth="7"
              strokeDasharray="251.2"
              strokeDashoffset="75"
              strokeLinecap="round"
              className="transition-all duration-700"
              fill="transparent"
            />
          </svg>

          {/* Center Glowing Icon Badge */}
          <div className={`absolute inset-0 m-auto w-14 h-14 rounded-full ${badgeColor} text-white flex items-center justify-center shadow-lg shadow-purple-500/30 border-2 border-white dark:border-slate-900 transform transition-transform duration-300 ${isActive ? "scale-110" : ""}`}>
            <Users className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Right Side: Year Indicator */}
        <div className="flex flex-col items-center justify-center text-center w-[62px]">
          <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
            {`Year ${activeMeta.year}`}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
            Year
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
        className={`flex items-center gap-3.5 h-13 ${activeMeta.inchargeBg || "bg-[#F7F6FF] dark:bg-purple-950/20"} rounded-2xl px-4 border border-slate-100 dark:border-slate-800/80 transition-all ${
          isHOD ? "cursor-pointer hover:brightness-95" : ""
        }`}
      >
        {hasIncharge ? (
          <Avatar src={c.incharge.profile_picture} name={c.incharge.name} size="sm" className="w-7.5 h-7.5 ring-2 ring-purple-500/20 shrink-0" />
        ) : (
          <div className="w-7.5 h-7.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-xs">
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
function CoverflowCarousel({ list, isHOD, onAssignIncharge, onNavigate }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const cardsRef = useRef([]);
  const prevActiveIndexRef = useRef(0);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const dragDistance = useRef(0);

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
                ? "w-7 h-2 bg-purple-600 dark:bg-purple-500 shadow-md shadow-purple-500/30" 
                : "w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>

      {/* Decorative Paper Plane Helper Subtitle */}
      <div className="flex items-center justify-center gap-2 mt-4 text-slate-400 dark:text-slate-500 text-xs font-semibold tracking-wide">
        <Send className="w-3.5 h-3.5 text-purple-500 transform -rotate-12 animate-pulse" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-150 dark:border-gray-700 w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-1.5 rounded-t-3xl bg-gradient-to-r ${meta?.gradient} shrink-0`} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta?.gradient} flex items-center justify-center`}>
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Incharge</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">{meta?.label} class</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto min-h-0">
          {eligibleFaculty.length === 0 ? (
            <div className="text-center py-10">
              <UserCog className="w-10 h-10 text-gray-300 dark:text-gray-650 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No eligible faculty</p>
              <p className="text-xs text-gray-400 dark:text-gray-505 mt-1">All faculty are already assigned as class incharge.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-1">
              {eligibleFaculty.map((f) => {
                const isSelected = selectedFacultyId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFacultyId(f.id)}
                    disabled={isPending}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left disabled:opacity-50 group ${isSelected
                        ? "border-primary-500 bg-primary-50/20 dark:bg-primary-950/15"
                        : "border-gray-100 dark:border-gray-700/60 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                      }`}
                  >
                    <Avatar src={f.profile_picture} name={f.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{f.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{f.designation}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-primary-600 bg-primary-600 text-white" : "border-gray-350 dark:border-gray-600"
                      }`}>
                      {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-800/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedFacultyId || isPending}
            onClick={() => onAssign({ className, facultyId: selectedFacultyId })}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 text-sm font-bold transition-all shadow-md shadow-indigo-500/10"
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
  const [levelTab, setLevelTab] = useState("UG"); // "UG" or "PG"

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
  const currentLevelList = levelTab === "UG" ? ugList : pgList;

  return (
    <div className="space-y-4 animate-fade-in pb-8">

      {/* ── Page Header ── */}
      <div className="flex flex-row items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Classes</h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
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
              onClick={() => setViewMode("coverflow")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "coverflow"
                  ? "bg-white dark:bg-gray-700 text-indigo-650 dark:text-indigo-400 shadow-sm"
                  : "text-gray-455 dark:text-gray-500 hover:text-gray-650"
              }`}
              title="3D Coverflow View"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-700 text-indigo-650 dark:text-indigo-400 shadow-sm"
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
                  ? "bg-white dark:bg-gray-700 text-indigo-650 dark:text-indigo-400 shadow-sm"
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
          DESKTOP VIEW: 3D Coverflow Carousel with Level Tabs
         ═══════════════════════════════════════════════════════════════════════ */}
      {viewMode === "coverflow" && (
        <div className="hidden md:block">
          {/* Level Switcher Pill Buttons (Undergraduate / Postgraduate) */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <button
              onClick={() => setLevelTab("UG")}
              className={`px-6 py-2.5 rounded-full font-extrabold text-sm transition-all duration-300 shadow-sm ${
                levelTab === "UG"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 ring-2 ring-purple-400/20 scale-105"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
              }`}
            >
              Undergraduate ({ugList.length})
            </button>
            <button
              onClick={() => setLevelTab("PG")}
              className={`px-6 py-2.5 rounded-full font-extrabold text-sm transition-all duration-300 shadow-sm ${
                levelTab === "PG"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 ring-2 ring-purple-400/20 scale-105"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
              }`}
            >
              Postgraduate ({pgList.length})
            </button>
          </div>

          {/* GSAP 3D Carousel */}
          <CoverflowCarousel
            list={currentLevelList}
            isHOD={isHOD}
            onAssignIncharge={setInchargeModal}
            onNavigate={navigateWithTransition}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE VIEW + DESKTOP FALLBACK GRID/LIST VIEWS
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={viewMode === "coverflow" ? "block md:hidden" : "block"}>
        {viewMode !== "list" ? (
          <>
            {/* UG Classes */}
            {ugList.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Undergraduate ({ugList.length} classes)</span>
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
                  <span className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Postgraduate ({pgList.length} classes)</span>
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
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
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

                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center">
                      {c.student_count ?? 0} Students
                    </span>

                    <div className="text-right" onClick={(e) => e.stopPropagation()}>
                      {isHOD ? (
                        <button
                          onClick={() => setInchargeModal(c.class_name)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-755 hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 transition-all active:scale-95"
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
    </div>
  );
}
