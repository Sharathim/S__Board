import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import {
  ChevronLeft, ChevronRight, Eye, Download, MessageSquare, Send, Smile,
  X, Paperclip, Plus, ArrowLeft, Users, FileText, CheckCircle2, Lock,
  Sparkles, Trophy, ShieldAlert, Flag, Home, Mountain, Compass, MapPin, AlertCircle
} from "lucide-react";

function parseUTCDate(dateStr) {
  if (!dateStr) return new Date();
  try {
    const s = String(dateStr);
    const d = new Date(s.endsWith('Z') ? s : s + 'Z');
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

/**
 * Procedural Low-Poly 3D Progress Monitor World using Three.js & GSAP.
 * Includes WebGL error boundary & graceful 2D isometric fallback for devices/browsers without WebGL hardware support.
 */
export default function ProgressWorld3D({
  project,
  timelineNodes = [],
  selectedIndex = 0,
  onSelectCheckpoint,
  isStudent,
  isFaculty,
  isHOD,
  currentUserId,
  onPostProgress,
  onPreviewAttachment,
  onAddComment,
  onDeleteComment,
  onReact,
  onEditProgress,
  onDeleteProgress,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const playerMeshRef = useRef(null);
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const checkpointMeshesRef = useRef([]);

  const [webGlSupported, setWebGlSupported] = useState(true);

  const safeTimelineNodes = Array.isArray(timelineNodes) ? timelineNodes : [];
  const totalSteps = safeTimelineNodes.length;
  const safeIndex = Math.min(Math.max(0, selectedIndex), totalSteps);
  const activeNode = safeTimelineNodes[safeIndex] || safeTimelineNodes[0] || null;

  // ─── Initialize 3D Scene with WebGL Try/Catch ───
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight - 80);

    // 1. WebGL Renderer Creation Guard
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) {
      console.warn("WebGL not supported or context creation failed:", e);
      setWebGlSupported(false);
      return;
    }

    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear previous children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 2. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.018);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(0, 24, 32);
    camera.lookAt(0, 0, 0);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xc7d2fe, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    sunLight.position.set(30, 45, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.5);
    fillLight.position.set(-30, 20, -20);
    scene.add(fillLight);

    // 4. Build Island Base & Path
    const pathPoints = generateWindingPath(totalSteps + 1);
    buildFloatingIsland(scene, pathPoints);

    // 5. Build Checkpoints
    checkpointMeshesRef.current = [];
    const checkpointGroup = new THREE.Group();
    scene.add(checkpointGroup);

    pathPoints.forEach((pt, idx) => {
      const isLocked = idx >= totalSteps;
      const cpMesh = createCheckpointMesh(idx, isLocked, idx === totalSteps - 1);
      cpMesh.position.copy(pt);
      cpMesh.userData = { index: idx, isLocked };
      checkpointGroup.add(cpMesh);
      checkpointMeshesRef.current.push(cpMesh);
    });

    // 6. Player Character Token
    const playerGroup = createPlayerCharacter();
    playerMeshRef.current = playerGroup;
    if (pathPoints[safeIndex]) {
      playerGroup.position.copy(pathPoints[safeIndex]);
    }
    scene.add(playerGroup);

    // 7. Particle System
    const particleCount = 100;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 60;
      pPos[i + 1] = Math.random() * 20 + 2;
      pPos[i + 2] = (Math.random() - 0.5) * 60;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.35,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // 8. Animation Loop
    let clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      scene.traverse((obj) => {
        if (obj.userData?.sway) obj.rotation.z = Math.sin(elapsed * 1.5 + obj.position.x) * 0.04;
        if (obj.userData?.drift) {
          obj.position.x += delta * 0.5;
          if (obj.position.x > 50) obj.position.x = -50;
        }
        if (obj.userData?.pulseGlow) {
          const s = 1 + Math.sin(elapsed * 3) * 0.08;
          obj.scale.set(s, s, s);
        }
        if (obj.userData?.spin) obj.rotation.y += delta * 1.2;
      });

      const positions = particles.geometry.attributes.position.array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += delta * 0.6;
        if (positions[i] > 25) positions[i] = 2;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      if (playerGroup && pathPoints[safeIndex]) {
        playerGroup.position.y = (pathPoints[safeIndex]?.y || 0) + Math.sin(elapsed * 3) * 0.15;
      }

      currentLookAt.current.lerp(targetLookAt.current, 0.06);
      camera.lookAt(currentLookAt.current);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || (window.innerHeight - 80);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(checkpointGroup.children, true);
      if (intersects.length > 0) {
        let topObj = intersects[0].object;
        while (topObj.parent && topObj.parent !== checkpointGroup) {
          topObj = topObj.parent;
        }
        if (topObj.userData?.index !== undefined) {
          onSelectCheckpoint(topObj.userData.index);
        }
      }
    };

    container.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("click", handleClick);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [totalSteps]);

  // ─── Camera & Player Movement ───
  useEffect(() => {
    if (!cameraRef.current || !sceneRef.current || !webGlSupported) return;

    const points = generateWindingPath(totalSteps + 1);
    const targetPt = points[safeIndex] || points[0] || new THREE.Vector3(0, 0, 0);

    targetLookAt.current.copy(targetPt);

    const cameraOffset = new THREE.Vector3(targetPt.x, targetPt.y + 18, targetPt.z + 24);

    gsap.to(cameraRef.current.position, {
      x: cameraOffset.x,
      y: cameraOffset.y,
      z: cameraOffset.z,
      duration: 1.4,
      ease: "power2.inOut",
    });

    if (playerMeshRef.current && points[safeIndex]) {
      gsap.to(playerMeshRef.current.position, {
        x: targetPt.x,
        y: targetPt.y,
        z: targetPt.z,
        duration: 1.2,
        ease: "power2.out",
        onComplete: () => {
          if (playerMeshRef.current) {
            playerMeshRef.current.rotation.y = 0;
            gsap.to(playerMeshRef.current.position, {
              y: targetPt.y + 0.8,
              duration: 0.25,
              yoyo: true,
              repeat: 1,
              ease: "power1.out",
            });
          }
        },
      });
    }

    checkpointMeshesRef.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const isSelected = idx === safeIndex;
      const scale = isSelected ? 1.25 : 1.0;
      gsap.to(mesh.scale, { x: scale, y: scale, z: scale, duration: 0.4, ease: "back.out(1.7)" });
    });
  }, [safeIndex, totalSteps, webGlSupported]);

  // ─── Keyboard Controls ───
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        if (safeIndex > 0) onSelectCheckpoint(safeIndex - 1);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (safeIndex < totalSteps) onSelectCheckpoint(safeIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [safeIndex, totalSteps, onSelectCheckpoint]);

  const isLockedSelected = safeIndex >= totalSteps;

  // Fallback View if WebGL is disabled/not supported
  if (!webGlSupported) {
    return (
      <div className="relative w-full h-[calc(100vh-80px)] bg-slate-950 p-6 overflow-y-auto font-sans text-white">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold">
              3D WebGL hardware acceleration is disabled in your browser settings. Displaying interactive journey view.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white">{project?.name || "Project Progress"}</h2>
            <div className="space-y-3">
              {safeTimelineNodes.map((node, i) => (
                <div key={node.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">Milestone {i + 1}</span>
                    <span className="text-[10px] text-slate-400">{node.dateStr}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{node.title || "Update"}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{node.accomplishment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden bg-slate-950 font-sans select-none">
      {/* ── 3D Canvas Mount Container ── */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* ── Top HUD Header Bar ── */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Project Badge */}
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2.5 shadow-xl pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shadow-md">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-tight truncate max-w-[180px] sm:max-w-xs">{project?.name || "Project"}</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">3D Project Journey</span>
          </div>
        </div>

        {/* Right Header Stats & Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Progress Percentage Badge */}
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl px-3.5 py-2 shadow-xl">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block leading-none">Journey</span>
              <span className="text-xs font-black text-amber-400">
                {totalSteps > 0 ? `${Math.round(((safeIndex + 1) / totalSteps) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Student Add Progress FAB */}
          {isStudent && (
            <button
              onClick={onPostProgress}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black shadow-xl hover:shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Post Progress
            </button>
          )}
        </div>
      </div>

      {/* ── Navigation Arrow Controls (Bottom Center) ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-900/90 backdrop-blur-lg border border-slate-700/70 rounded-full p-1.5 shadow-2xl">
        <button
          onClick={() => safeIndex > 0 && onSelectCheckpoint(safeIndex - 1)}
          disabled={safeIndex === 0}
          className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Milestone Steps Dots */}
        <div className="flex items-center gap-1.5 px-3">
          {Array.from({ length: totalSteps + 1 }).map((_, idx) => {
            const isCurrent = idx === safeIndex;
            const isLock = idx >= totalSteps;
            return (
              <button
                key={idx}
                onClick={() => onSelectCheckpoint(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  isCurrent
                    ? "w-6 bg-indigo-500 shadow-md shadow-indigo-500/50"
                    : isLock
                    ? "w-2.5 bg-amber-500/50 hover:bg-amber-400"
                    : "w-2.5 bg-slate-600 hover:bg-slate-400"
                }`}
                title={isLock ? "Locked Milestone" : `Milestone ${idx + 1}`}
              />
            );
          })}
        </div>

        <button
          onClick={() => safeIndex < totalSteps && onSelectCheckpoint(safeIndex + 1)}
          disabled={safeIndex >= totalSteps}
          className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-white disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Floating Glassmorphic Information Panel ── */}
      {activeNode && !isLockedSelected && (
        <GlassInfoPanel
          node={activeNode}
          projectId={project?.id}
          isStudent={isStudent}
          isFaculty={isFaculty}
          isHOD={isHOD}
          currentUserId={currentUserId}
          onPreviewAttachment={onPreviewAttachment}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onReact={onReact}
          onEditProgress={onEditProgress}
          onDeleteProgress={onDeleteProgress}
          stepIndex={safeIndex}
          totalSteps={totalSteps}
        />
      )}

      {/* ── Locked Area Overlay Card ── */}
      {isLockedSelected && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-[90vw] max-w-md bg-slate-900/90 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">Locked Milestone Realm</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Complete another progress update to build the bridge and unlock this new area!
            </p>
          </div>
          {isStudent && (
            <button
              onClick={onPostProgress}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Submit Progress Update
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Floating Glassmorphic Information Panel ──────────────────────────────────

function GlassInfoPanel({
  node, projectId, isStudent, isFaculty, isHOD, currentUserId,
  onPreviewAttachment, onAddComment, onDeleteComment, onReact,
  onEditProgress, onDeleteProgress, stepIndex, totalSteps
}) {
  const [minimized, setMinimized] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!node) return null;

  const comments = node.comments || [];

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackInput.trim()) return;
    setSubmitting(true);
    await onAddComment(node.id, feedbackInput.trim());
    setFeedbackInput("");
    setSubmitting(false);
  };

  return (
    <div className={`absolute bottom-20 left-4 right-4 md:left-8 md:right-auto md:w-[460px] z-30 bg-slate-900/90 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl transition-all duration-300 ${
      minimized ? "max-h-16 overflow-hidden" : "max-h-[65vh] overflow-y-auto scrollbar-premium"
    }`}>
      {/* Header Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0">
            {(node.author || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black text-white truncate">{node.author || "Unknown"}</h3>
            <p className="text-[10px] font-semibold text-slate-400">Milestone {stepIndex + 1} of {totalSteps} • {node.dateStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {node.isOwn && node.canEdit && (
            <button onClick={() => onEditProgress(node)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Edit">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
          )}
          {(node.isOwn || isHOD) && (
            <button onClick={() => onDeleteProgress(node.id)} className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors" title="Delete">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setMinimized(!minimized)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="p-5 space-y-4">
          {/* Progress Title */}
          {node.title && (
            <h2 className="text-base font-black text-white leading-snug tracking-tight">
              {node.title}
            </h2>
          )}

          {/* Progress Description */}
          {node.accomplishment && (
            <p className="text-xs font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">
              {node.accomplishment}
            </p>
          )}

          {/* Attachments List */}
          {node.attachments && node.attachments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Attachments ({node.attachments.length})
              </span>
              <div className="space-y-1.5">
                {node.attachments.map((att, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-200 truncate">{att.name || "Attachment"}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onPreviewAttachment(att)}
                        className="p-1.5 rounded-lg hover:bg-indigo-950/60 text-slate-400 hover:text-indigo-300 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={att.url}
                        download={att.name || true}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-300 transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Faculty Feedback Section */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Faculty Feedback ({comments.length})
            </span>

            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {(isFaculty || isHOD) ? "Share feedback on this progress update." : "No faculty feedback added yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>{c.author?.name || "Faculty"}</span>
                      {(isHOD || c.author?.id === currentUserId) && (
                        <button onClick={() => onDeleteComment(node.id, c.id)} className="text-slate-500 hover:text-rose-400">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            {(isFaculty || isHOD) && (
              <form onSubmit={handleSendFeedback} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  placeholder="Write faculty feedback..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <button
                  type="submit"
                  disabled={!feedbackInput.trim() || submitting}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3D Procedural Mesh Helpers ───────────────────────────────────────────────

function generateWindingPath(count) {
  const points = [];
  const radius = 18;
  const safeCount = Math.max(count || 0, 3);
  for (let i = 0; i < safeCount; i++) {
    const t = i / Math.max(safeCount - 1, 1);
    const angle = t * Math.PI * 2.2 - Math.PI * 0.5;
    const r = radius + Math.sin(t * Math.PI * 3) * 4;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = Math.sin(t * Math.PI * 2) * 1.5 + 0.6;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function buildFloatingIsland(scene, pathPoints) {
  const islandGeo = new THREE.CylinderGeometry(26, 8, 12, 12);
  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
  });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.set(0, -6, 0);
  island.receiveShadow = true;
  scene.add(island);

  const grassGeo = new THREE.CylinderGeometry(26.2, 25.8, 1.2, 16);
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.6,
    metalness: 0.05,
    flatShading: true,
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.position.set(0, 0, 0);
  grass.receiveShadow = true;
  scene.add(grass);

  pathPoints.forEach((pt) => {
    const paverGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.3, 7);
    const paverMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, flatShading: true });
    const paver = new THREE.Mesh(paverGeo, paverMat);
    paver.position.copy(pt);
    paver.position.y -= 0.1;
    paver.receiveShadow = true;
    scene.add(paver);
  });

  for (let i = 0; i < 22; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 8 + Math.random() * 16;
    const px = Math.cos(ang) * rad;
    const pz = Math.sin(ang) * rad;

    const nearPath = pathPoints.some(pt => pt.distanceTo(new THREE.Vector3(px, 0, pz)) < 3.5);
    if (!nearPath) {
      const tree = createPineTree();
      tree.position.set(px, 0.6, pz);
      scene.add(tree);
    }
  }
}

function createPineTree() {
  const group = new THREE.Group();
  group.userData = { sway: true };

  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.8, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9, flatShading: true });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.9;
  trunk.castShadow = true;
  group.add(trunk);

  const foliageColor = [0x059669, 0x047857, 0x10b981][Math.floor(Math.random() * 3)];
  const folMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.7, flatShading: true });

  [2.2, 3.2, 4.0].forEach((y, i) => {
    const r = 1.4 - i * 0.35;
    const folGeo = new THREE.ConeGeometry(r, 1.6, 5);
    const fol = new THREE.Mesh(folGeo, folMat);
    fol.position.y = y;
    fol.castShadow = true;
    group.add(fol);
  });

  return group;
}

function createCheckpointMesh(index, isLocked, isLatest) {
  const group = new THREE.Group();

  if (isLocked) {
    const archGeo = new THREE.TorusGeometry(1.6, 0.3, 6, 12);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, flatShading: true });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.y = 1.6;
    group.add(arch);

    const lockGeo = new THREE.BoxGeometry(0.8, 0.9, 0.4);
    const lockMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(0, 1.6, 0);
    lock.userData = { pulseGlow: true };
    group.add(lock);
    return group;
  }

  const themes = ["camp", "tower", "gate", "village", "castle", "mountain", "temple", "trophy"];
  const theme = themes[index % themes.length];

  if (theme === "camp") {
    const tentGeo = new THREE.ConeGeometry(1.4, 2.2, 4);
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6, flatShading: true });
    const tent = new THREE.Mesh(tentGeo, tentMat);
    tent.position.set(0, 1.1, 0);
    tent.castShadow = true;
    group.add(tent);
  } else if (theme === "tower") {
    const towerGeo = new THREE.CylinderGeometry(1.1, 1.3, 3.2, 7);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, flatShading: true });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 1.6;
    tower.castShadow = true;
    group.add(tower);
  } else if (theme === "gate") {
    const gateGeo = new THREE.TorusGeometry(1.8, 0.35, 6, 12);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x818cf8, roughness: 0.4, flatShading: true });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.y = 1.8;
    group.add(gate);
  } else if (theme === "trophy") {
    const baseGeo = new THREE.BoxGeometry(2, 0.8, 2);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.4;
    group.add(base);

    const starGeo = new THREE.OctahedronGeometry(1.1);
    const starMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.1, metalness: 1.0 });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.y = 2.2;
    star.userData = { spin: true };
    group.add(star);
  } else {
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.75;
    group.add(pole);

    const flagGeo = new THREE.BoxGeometry(1.2, 0.8, 0.05);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, flatShading: true });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.6, 2.8, 0);
    group.add(flag);
  }

  if (isLatest) {
    const ringGeo = new THREE.RingGeometry(2.0, 2.4, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    ring.userData = { pulseGlow: true };
    group.add(ring);
  }

  return group;
}

function createPlayerCharacter() {
  const group = new THREE.Group();

  const headGeo = new THREE.SphereGeometry(0.45, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5, flatShading: true });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.9;
  head.castShadow = true;
  group.add(head);

  const hatGeo = new THREE.ConeGeometry(0.7, 0.5, 6);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8, flatShading: true });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 2.3;
  group.add(hat);

  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.65, 1.2, 6);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.6, flatShading: true });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  const packGeo = new THREE.BoxGeometry(0.5, 0.6, 0.4);
  const packMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
  const pack = new THREE.Mesh(packGeo, packMat);
  pack.position.set(0, 1.1, -0.45);
  group.add(pack);

  return group;
}
