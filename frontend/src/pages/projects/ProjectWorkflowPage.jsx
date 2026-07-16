import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Save, Plus, X, FolderKanban, GraduationCap,
  MessageSquare, Users, Search, Check, ChevronRight, Sparkles,
  ZoomIn, ZoomOut, Maximize2, Loader2
} from "lucide-react";
import { listFaculty } from "../../api/faculty";
import { listAllStudents } from "../../api/classes";
import { listForumMembers } from "../../api/forum";
import { createProject, updateProject, getProject } from "../../api/projects";
import { Avatar } from "../../components/ui/Avatar";

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 260;
const NODE_H = 140;
const GRID_GAP = 340;
const CANVAS_H = 520;

const NODE_CONFIGS = [
  {
    id: "project",
    type: "project",
    label: "Project",
    icon: FolderKanban,
    color: "#F05A2B",
    bg: "from-orange-500 to-red-500",
    lightBg: "#fff7f4",
    darkBg: "#1f1008",
    description: "Name your project",
  },
  {
    id: "faculty",
    type: "faculty",
    label: "Faculty Advisors",
    icon: GraduationCap,
    color: "#6366F1",
    bg: "from-indigo-500 to-purple-500",
    lightBg: "#f5f5ff",
    darkBg: "#0f0f1f",
    description: "Assign faculty mentors",
  },
  {
    id: "forum",
    type: "forum",
    label: "Forum Coordinators",
    icon: MessageSquare,
    color: "#F59E0B",
    bg: "from-amber-500 to-yellow-500",
    lightBg: "#fffbf0",
    darkBg: "#1a1505",
    description: "Link forum coordinators",
  },
  {
    id: "students",
    type: "students",
    label: "Student Team",
    icon: Users,
    color: "#10B981",
    bg: "from-emerald-500 to-teal-500",
    lightBg: "#f0fdf8",
    darkBg: "#051a12",
    description: "Add student members",
  },
];

// ─── SVG Bezier Edge ──────────────────────────────────────────────────────────
function WorkflowEdge({ fromNode, toNode, color = "#F05A2B", active }) {
  const x1 = fromNode.x + NODE_W;
  const y1 = fromNode.y + NODE_H / 2;
  const x2 = toNode.x;
  const y2 = toNode.y + NODE_H / 2;
  const cx1 = x1 + (x2 - x1) * 0.5;
  const cy1 = y1;
  const cx2 = x1 + (x2 - x1) * 0.5;
  const cy2 = y2;

  return (
    <g>
      {/* Shadow/glow path */}
      <path
        d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeOpacity="0.12"
        strokeLinecap="round"
      />
      {/* Main edge */}
      <path
        d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity={active ? "0.9" : "0.45"}
        strokeLinecap="round"
        strokeDasharray={active ? "none" : "6 4"}
        style={{ transition: "stroke-opacity 0.3s" }}
      />
      {/* Animated flow dots */}
      {active && (
        <circle r="4" fill={color} opacity="0.85">
          <animateMotion
            dur="1.6s"
            repeatCount="indefinite"
            path={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
          />
        </circle>
      )}
      {/* Arrow at destination */}
      <polygon
        points={`${x2},${y2} ${x2 - 10},${y2 - 5} ${x2 - 10},${y2 + 5}`}
        fill={color}
        opacity={active ? "0.9" : "0.45"}
      />
    </g>
  );
}

// ─── Individual Workflow Node ──────────────────────────────────────────────────
function WorkflowNode({
  config, position, isActive, isPlaced, members, onDragStart,
  onAddNext, onDoubleClick, hasNext, isDragging, canAddNext,
}) {
  const Icon = config.icon;
  const memberCount = members?.length || 0;

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: NODE_W,
        height: NODE_H,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        zIndex: isActive ? 20 : 10,
        transition: isDragging ? "none" : "box-shadow 0.2s, transform 0.15s",
        transform: isActive && !isDragging ? "scale(1.02)" : "scale(1)",
      }}
      onMouseDown={onDragStart}
      onDoubleClick={onDoubleClick}
    >
      {/* Node Card */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 20,
          background: "#ffffff",
          border: `2px solid ${isActive ? config.color : "rgba(0,0,0,0.08)"}`,
          boxShadow: isActive
            ? `0 0 0 4px ${config.color}22, 0 16px 40px ${config.color}18`
            : "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
        className="dark:[background:#1e293b] dark:[border-color:rgba(255,255,255,0.08)]"
      >
        {/* Top strip */}
        <div
          style={{
            background: `linear-gradient(135deg, ${config.color}18, ${config.color}08)`,
            borderBottom: `1px solid ${config.color}20`,
            padding: "10px 14px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${config.color}22, ${config.color}44)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon style={{ width: 14, height: 14, color: config.color }} />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: config.color,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {config.label}
          </span>
          {isPlaced && (
            <div
              style={{
                marginLeft: "auto",
                background: config.color,
                borderRadius: "50%",
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check style={{ width: 10, height: 10, color: "#fff" }} />
            </div>
          )}
        </div>

        {/* Body content */}
        <div style={{ padding: "10px 14px", flex: 1 }}>
          {config.type === "project" ? (
            <ProjectNameField color={config.color} />
          ) : (
            <div>
              <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
                {memberCount > 0
                  ? `${memberCount} member${memberCount !== 1 ? "s" : ""} assigned`
                  : config.description}
              </p>
              {memberCount > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  {members.slice(0, 3).map((m) => (
                    <span
                      key={m.user_id}
                      style={{
                        fontSize: 10,
                        background: `${config.color}14`,
                        color: config.color,
                        borderRadius: 20,
                        padding: "2px 7px",
                        fontWeight: 600,
                        border: `1px solid ${config.color}25`,
                      }}
                    >
                      {m.name?.split(" ")[0]}
                    </span>
                  ))}
                  {memberCount > 3 && (
                    <span
                      style={{
                        fontSize: 10,
                        background: "#f1f5f9",
                        color: "#64748b",
                        borderRadius: 20,
                        padding: "2px 7px",
                        fontWeight: 600,
                      }}
                    >
                      +{memberCount - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hover hint */}
        {config.type !== "project" && (
          <p
            style={{
              fontSize: 9,
              color: "#9ca3af",
              textAlign: "center",
              padding: "0 14px 8px",
              fontStyle: "italic",
            }}
          >
            double-click to edit members
          </p>
        )}
      </div>

      {/* Add Next Node Button */}
      {canAddNext && !hasNext && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onAddNext(); }}
          style={{
            position: "absolute",
            right: -18,
            top: "50%",
            transform: "translateY(-50%)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: config.color,
            border: "3px solid #fff",
            boxShadow: `0 4px 12px ${config.color}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 30,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(-50%) scale(1)";
          }}
          title={`Add ${NODE_CONFIGS[NODE_CONFIGS.findIndex((n) => n.type === config.type) + 1]?.label || ""}`}
        >
          <Plus style={{ width: 16, height: 16, color: "#fff" }} />
        </button>
      )}
    </div>
  );
}

// ─── Inline editable project name ────────────────────────────────────────────
function ProjectNameField({ color }) {
  // Access from parent context via DOM query (simple approach)
  return (
    <input
      id="project-name-input"
      type="text"
      placeholder="Enter project name..."
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        outline: "none",
        fontSize: 14,
        fontWeight: 700,
        color: "#111827",
        fontFamily: "inherit",
        cursor: "text",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="dark:text-white placeholder-gray-400"
    />
  );
}

// ─── Member Selection Panel ────────────────────────────────────────────────────
function MemberPanel({ nodeType, selected, onClose, onConfirm }) {
  const [tab, setTab] = useState(nodeType || "faculty");
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState(selected || []);

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
  });
  const { data: forumData } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then((r) => r.data.members),
  });
  const { data: studentsData } = useQuery({
    queryKey: ["all-students"],
    queryFn: () => listAllStudents().then((r) => r.data.students),
  });

  useEffect(() => {
    if (nodeType) setTab(nodeType);
    setLocalSelected(selected || []);
  }, [nodeType, selected]);

  const getPeople = () => {
    if (tab === "faculty")
      return (facultyData || []).map((f) => ({
        user_id: f.user_id, name: f.name, profile_picture: f.profile_picture,
        subtitle: f.designation, role: "faculty",
      }));
    if (tab === "forum")
      return (forumData || []).map((m) => ({
        user_id: m.user_id, name: m.name, profile_picture: m.profile_picture,
        subtitle: m.role, role: "forum_member",
      }));
    return (studentsData || []).map((s) => ({
      user_id: s.user_id, name: s.name, profile_picture: s.profile_picture,
      subtitle: s.class_name?.replace("_", " "), role: "student",
    }));
  };

  const roleMap = { faculty: "faculty", forum: "forum_member", students: "student" };
  const currentRole = roleMap[tab];
  const people = getPeople().filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (person) => {
    setLocalSelected((prev) => {
      const exists = prev.find((m) => m.user_id === person.user_id);
      if (exists) return prev.filter((m) => m.user_id !== person.user_id);
      return [...prev, { ...person, role_in_project: currentRole }];
    });
  };

  const tabConfigs = [
    { id: "faculty", label: "Faculty", icon: GraduationCap, color: "#6366F1" },
    { id: "forum", label: "Forum", icon: MessageSquare, color: "#F59E0B" },
    { id: "students", label: "Students", icon: Users, color: "#10B981" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        background: "#fff",
        borderLeft: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        animation: "slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}
      className="dark:[background:#1e293b] dark:[border-color:rgba(255,255,255,0.06)]"
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Panel Header */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
        className="dark:[border-color:rgba(255,255,255,0.06)]"
      >
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }} className="dark:text-white">
            Assign Members
          </h3>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            Click to select, confirm to save
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: "#f1f5f9", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          className="dark:[background:#334155]"
        >
          <X style={{ width: 16, height: 16, color: "#64748b" }} />
        </button>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}
        className="dark:[border-color:rgba(255,255,255,0.06)]"
      >
        {tabConfigs.map((t) => {
          const TIcon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(""); }}
              style={{
                flex: 1, padding: "7px 4px", borderRadius: 10, border: "none",
                cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: isActive ? `${t.color}18` : "transparent",
                color: isActive ? t.color : "#9ca3af",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "all 0.2s",
              }}
            >
              <TIcon style={{ width: 14, height: 14 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px 8px", flexShrink: 0, position: "relative" }}>
        <Search style={{
          position: "absolute", left: 28, top: "50%", transform: "translateY(-20%)",
          width: 14, height: 14, color: "#9ca3af",
        }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          style={{
            width: "100%", padding: "9px 12px 9px 36px",
            borderRadius: 12, border: "1.5px solid #e2e8f0",
            fontSize: 13, outline: "none", background: "#f8fafc",
            fontFamily: "inherit", color: "#111827", boxSizing: "border-box",
          }}
          className="dark:[background:#0f172a] dark:[border-color:rgba(255,255,255,0.08)] dark:text-white"
        />
      </div>

      {/* People List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px" }}>
        {people.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
            <p style={{ fontSize: 13, fontWeight: 500 }}>No matches found</p>
          </div>
        ) : (
          people.map((person) => {
            const isSelected = localSelected.some((s) => s.user_id === person.user_id);
            const activeTab = tabConfigs.find((t) => t.id === tab);
            return (
              <div
                key={person.user_id}
                onClick={() => toggle(person)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 10px", borderRadius: 12, cursor: "pointer",
                  marginBottom: 2, transition: "all 0.15s",
                  background: isSelected ? `${activeTab?.color}10` : "transparent",
                  border: `1.5px solid ${isSelected ? activeTab?.color + "30" : "transparent"}`,
                }}
              >
                <Avatar src={person.profile_picture} name={person.name} size="sm"
                  className="w-8 h-8 rounded-full shrink-0" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, truncate: true }}
                    className="dark:text-white">{person.name}</p>
                  {person.subtitle && (
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0" }}>{person.subtitle}</p>
                  )}
                </div>
                <div
                  style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${isSelected ? activeTab?.color : "#d1d5db"}`,
                    background: isSelected ? activeTab?.color : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  {isSelected && <Check style={{ width: 12, height: 12, color: "#fff" }} />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Footer */}
      <div
        style={{
          padding: "14px 16px", borderTop: "1px solid rgba(0,0,0,0.06)",
          flexShrink: 0, display: "flex", gap: 8,
        }}
        className="dark:[border-color:rgba(255,255,255,0.06)]"
      >
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: "10px", borderRadius: 12, border: "1.5px solid #e2e8f0",
            background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            color: "#374151", fontFamily: "inherit",
          }}
          className="dark:[background:#1e293b] dark:[border-color:rgba(255,255,255,0.08)] dark:text-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(localSelected)}
          style={{
            flex: 2, padding: "10px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #F05A2B, #C93D14)",
            fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff",
            fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
          }}
        >
          <Check style={{ width: 14, height: 14 }} />
          Confirm ({localSelected.length} selected)
        </button>
      </div>
    </div>
  );
}

// ─── Main Workflow Page ────────────────────────────────────────────────────────
export default function ProjectWorkflowPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const isEdit = Boolean(projectId);
  const queryClient = useQueryClient();

  // Canvas state
  const canvasRef = useRef(null);
  const [projectName, setProjectName] = useState("");
  const [placedNodes, setPlacedNodes] = useState(["project"]); // node type ids in order
  const [nodePositions, setNodePositions] = useState({
    project: { x: 60, y: 190 },
  });
  const [members, setMembers] = useState({
    faculty: [],
    forum: [],
    students: [],
  });
  const [activeNode, setActiveNode] = useState("project");
  const [dragging, setDragging] = useState(null);
  const [panelOpen, setPanelOpen] = useState(null); // "faculty" | "forum" | "students"
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load existing project in edit mode
  const { data: existingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingProject && isEdit) {
      setProjectName(existingProject.name || "");
      const facultyM = existingProject.members?.filter((m) => m.role_in_project === "faculty") || [];
      const forumM = existingProject.members?.filter((m) => m.role_in_project === "forum_member") || [];
      const studentM = existingProject.members?.filter((m) => m.role_in_project === "student") || [];

      const mapM = (arr, role) =>
        arr.map((m) => ({ user_id: m.id, name: m.name, profile_picture: m.profile_picture, role_in_project: role }));

      setMembers({
        faculty: mapM(facultyM, "faculty"),
        forum: mapM(forumM, "forum_member"),
        students: mapM(studentM, "student"),
      });

      // Place all existing nodes
      const nPlaced = ["project"];
      if (facultyM.length > 0) nPlaced.push("faculty");
      if (forumM.length > 0) nPlaced.push("forum");
      if (studentM.length > 0) nPlaced.push("students");

      setPlacedNodes(nPlaced);
      setNodePositions(buildDefaultPositions(nPlaced));
    }
  }, [existingProject, isEdit]);

  function buildDefaultPositions(placed) {
    const positions = {};
    placed.forEach((nodeType, i) => {
      positions[nodeType] = { x: 60 + i * GRID_GAP, y: 190 };
    });
    return positions;
  }

  // Keep positions in sync when new nodes added
  const getNextNodeType = (currentType) => {
    const order = ["project", "faculty", "forum", "students"];
    const idx = order.indexOf(currentType);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const handleAddNext = (fromType) => {
    const nextType = getNextNodeType(fromType);
    if (!nextType || placedNodes.includes(nextType)) return;

    const currentPos = nodePositions[fromType];
    const newPos = { x: currentPos.x + GRID_GAP, y: currentPos.y };

    setNodePositions((prev) => ({ ...prev, [nextType]: newPos }));
    setPlacedNodes((prev) => [...prev, nextType]);
    setActiveNode(nextType);

    // Open the member panel immediately (unless it's project node)
    if (nextType !== "project") {
      setPanelOpen(nextType);
    }
  };

  // Drag handling
  const handleDragStart = useCallback((nodeType, e) => {
    e.preventDefault();
    setActiveNode(nodeType);
    const startX = e.clientX - nodePositions[nodeType].x;
    const startY = e.clientY - nodePositions[nodeType].y;
    setDragging({ nodeType, startX, startY });
  }, [nodePositions]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const newX = Math.max(0, Math.min(e.clientX - dragging.startX, rect.width - NODE_W - 20));
      const newY = Math.max(0, Math.min(e.clientY - dragging.startY, CANVAS_H - NODE_H - 20));
      setNodePositions((prev) => ({
        ...prev,
        [dragging.nodeType]: { x: newX, y: newY },
      }));
    };

    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // Save project
  const handleSave = async () => {
    if (!projectName.trim()) {
      document.getElementById("project-name-input")?.focus();
      return;
    }
    setSaving(true);
    try {
      const allMembers = [
        ...members.faculty.map((m) => ({ user_id: m.user_id, role_in_project: "faculty" })),
        ...members.forum.map((m) => ({ user_id: m.user_id, role_in_project: "forum_member" })),
        ...members.students.map((m) => ({ user_id: m.user_id, role_in_project: "student" })),
      ];
      const payload = {
        name: projectName.trim(),
        description: "",
        status: existingProject?.status || "IN_PROGRESS",
        members: allMembers,
      };
      if (isEdit) {
        await updateProject(projectId, payload);
      } else {
        await createProject(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      setSaved(true);
      setTimeout(() => navigate("/projects"), 800);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  // Canvas dimensions responsive
  const canvasWidth = canvasRef.current?.clientWidth || 1000;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 999,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
      className="dark:[background:#0f172a]"
    >
      {/* ─── Top Nav Bar ─── */}
      <div
        style={{
          height: "clamp(52px, 6.5vh, 64px)",
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          display: "flex",
          alignItems: "center",
          padding: "0 clamp(12px, 2vw, 24px)",
          gap: "clamp(8px, 1.2vw, 16px)",
          flexShrink: 0,
          zIndex: 50,
          flexWrap: "nowrap",
          overflowX: "auto",
        }}
        className="dark:[background:#1e293b] dark:[border-color:rgba(255,255,255,0.06)]"
      >
        <button
          onClick={() => navigate("/projects")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px clamp(8px, 1vw, 14px)", borderRadius: 10, border: "1.5px solid #e2e8f0",
            background: "#fff", cursor: "pointer", fontSize: "clamp(11px, 1.2vw, 13px)",
            fontWeight: 600, color: "#374151", fontFamily: "inherit",
            transition: "all 0.2s", flexShrink: 0,
          }}
          className="dark:[background:#1e293b] dark:[border-color:rgba(255,255,255,0.08)] dark:text-gray-300 hover:border-[#F05A2B]/60 hover:text-[#F05A2B]"
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back
        </button>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: "clamp(10px, 1vw, 12px)", color: "#9ca3af" }}>Projects</span>
          <ChevronRight style={{ width: 11, height: 11, color: "#d1d5db" }} />
          <span style={{ fontSize: "clamp(11px, 1.1vw, 13px)", fontWeight: 700, color: "#111827" }} className="dark:text-white">
            {isEdit ? "Edit Project" : "New Project"}
          </span>
        </div>

        {/* Badge - hidden on small screens */}
        <div
          className="hidden sm:block"
          style={{
            padding: "3px clamp(6px, 0.8vw, 10px)", borderRadius: 20,
            background: "rgba(240,90,43,0.1)", border: "1px solid rgba(240,90,43,0.2)",
            fontSize: "clamp(9px, 0.8vw, 10px)", fontWeight: 700, color: "#F05A2B",
            textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
          }}
        >
          Workflow Canvas
        </div>

        <div style={{ flex: 1 }} />

        {/* Hints — hidden on screens < 1024px */}
        <div className="hidden lg:flex" style={{ gap: "clamp(8px, 1.5vw, 16px)", alignItems: "center" }}>
          {[
            "Drag nodes to arrange",
            "Click + to add next node",
            "Double-click to edit members",
          ].map((hint) => (
            <span key={hint} style={{ fontSize: "clamp(9px, 0.8vw, 11px)", color: "#9ca3af", fontStyle: "italic", whiteSpace: "nowrap" }}>
              {hint}
            </span>
          ))}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "clamp(7px, 1vw, 10px) clamp(12px, 1.8vw, 22px)",
            borderRadius: 12, border: "none",
            background: saved
              ? "linear-gradient(135deg, #10b981, #059669)"
              : "linear-gradient(135deg, #F05A2B, #C93D14)",
            color: "#fff", fontSize: "clamp(11px, 1.1vw, 13px)", fontWeight: 700,
            cursor: saving || saved ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: saving ? 0.8 : 1,
            boxShadow: "0 4px 14px rgba(240,90,43,0.35)",
            transition: "all 0.3s", flexShrink: 0, whiteSpace: "nowrap",
          }}
        >
          {saving ? (
            <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
          ) : saved ? (
            <Check style={{ width: 15, height: 15 }} />
          ) : (
            <Save style={{ width: 15, height: 15 }} />
          )}
          {saved ? "Saved!" : saving ? "Saving..." : isEdit ? "Update Project" : "Create Project"}
        </button>
      </div>

      {/* ─── Canvas Area ─── */}
      <div
        ref={canvasRef}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
          cursor: dragging ? "grabbing" : "default",
        }}
        className="dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)]"
        onClick={() => setActiveNode(null)}
      >
        {/* SVG Edges */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}
        >
          {placedNodes.slice(0, -1).map((nodeType, i) => {
            const fromConfig = NODE_CONFIGS.find((n) => n.type === nodeType);
            const toType = placedNodes[i + 1];
            const toConfig = NODE_CONFIGS.find((n) => n.type === toType);
            const fromPos = nodePositions[nodeType];
            const toPos = nodePositions[toType];
            if (!fromPos || !toPos) return null;

            const isActive = activeNode === nodeType || activeNode === toType;
            return (
              <WorkflowEdge
                key={`${nodeType}-${toType}`}
                fromNode={{ x: fromPos.x, y: fromPos.y }}
                toNode={{ x: toPos.x, y: toPos.y }}
                color={fromConfig?.color || "#F05A2B"}
                active={isActive}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {placedNodes.map((nodeType, idx) => {
          const config = NODE_CONFIGS.find((n) => n.type === nodeType);
          const position = nodePositions[nodeType] || { x: 60 + idx * GRID_GAP, y: 190 };
          const nextType = getNextNodeType(nodeType);
          const hasNext = nextType ? placedNodes.includes(nextType) : true;
          const canAddNext = nextType !== null;
          const nodeMembersKey = nodeType === "faculty" ? "faculty"
            : nodeType === "forum" ? "forum"
            : nodeType === "students" ? "students"
            : null;

          return (
            <WorkflowNode
              key={nodeType}
              config={config}
              position={position}
              isActive={activeNode === nodeType}
              isPlaced={nodeType !== "project"
                ? (nodeMembersKey ? members[nodeMembersKey].length > 0 : false)
                : projectName.trim().length > 0}
              members={nodeMembersKey ? members[nodeMembersKey] : []}
              isDragging={dragging?.nodeType === nodeType}
              hasNext={hasNext}
              canAddNext={canAddNext}
              onDragStart={(e) => handleDragStart(nodeType, e)}
              onAddNext={() => handleAddNext(nodeType)}
              onDoubleClick={() => {
                if (nodeType !== "project") setPanelOpen(nodeType);
              }}
            />
          );
        })}

        {/* Project Name Sync */}
        <ProjectNameSync value={projectName} onChange={setProjectName} />

        {/* Empty canvas hint */}
        {placedNodes.length === 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 40,
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
              Name your project, then click the orange + to add Faculty → Forum → Students
            </p>
          </div>
        )}
      </div>

      {/* ─── Right Member Panel ─── */}
      {panelOpen && (
        <MemberPanel
          nodeType={panelOpen}
          selected={members[panelOpen]}
          onClose={() => setPanelOpen(null)}
          onConfirm={(selected) => {
            setMembers((prev) => ({ ...prev, [panelOpen]: selected }));
            setPanelOpen(null);
          }}
        />
      )}

      {/* Spin keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Bridge component: syncs the project name input (inside draggable node) with state
function ProjectNameSync({ value, onChange }) {
  useEffect(() => {
    const input = document.getElementById("project-name-input");
    if (!input) return;
    if (input.value !== value) input.value = value;
    const handler = (e) => onChange(e.target.value);
    input.addEventListener("input", handler);
    return () => input.removeEventListener("input", handler);
  });
  return null;
}
