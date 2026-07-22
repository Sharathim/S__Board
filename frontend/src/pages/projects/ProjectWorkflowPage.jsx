import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Save, Plus, X, FolderKanban, GraduationCap,
  MessageSquare, Users, Search, Check, ChevronRight, Sparkles,
  Loader2, GripVertical
} from "lucide-react";
import { listFaculty } from "../../api/faculty";
import { listAllStudents } from "../../api/classes";
import { listForumMembers } from "../../api/forum";
import { createProject, updateProject, getProject } from "../../api/projects";
import { Avatar } from "../../components/ui/Avatar";

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 280;
const NODE_H = 150;
const GRID_GAP = 360;
const CANVAS_H = 550;

const NODE_CONFIGS = [
  {
    id: "project",
    type: "project",
    label: "Project Name",
    icon: FolderKanban,
    color: "#F05A2B",
    bg: "from-orange-500 to-red-500",
    lightBg: "#fff7f4",
    darkBg: "#1f1008",
    description: "Enter project title...",
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

// ─── SVG Bezier Edge with Continuous Flow Animation ─────────────────────────
function WorkflowEdge({ fromNode, toNode, color = "#F05A2B" }) {
  const x1 = fromNode.x + NODE_W;
  const y1 = fromNode.y + NODE_H / 2;
  const x2 = toNode.x;
  const y2 = toNode.y + NODE_H / 2;
  const cx1 = x1 + (x2 - x1) * 0.45;
  const cy1 = y1;
  const cx2 = x1 + (x2 - x1) * 0.55;
  const cy2 = y2;

  return (
    <g>
      {/* Background glow path */}
      <path
        d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeOpacity="0.08"
        strokeLinecap="round"
      />
      {/* Main dashed flow edge */}
      <path
        d={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeOpacity="0.75"
        strokeLinecap="round"
        strokeDasharray="6 5"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="22;0"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>
      {/* Flowing particle dot */}
      <circle r="4.5" fill={color} opacity="0.9">
        <animateMotion
          dur="1.5s"
          repeatCount="indefinite"
          path={`M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`}
        />
      </circle>
      {/* Destination Arrow */}
      <polygon
        points={`${x2},${y2} ${x2 - 10},${y2 - 5} ${x2 - 10},${y2 + 5}`}
        fill={color}
        opacity="0.8"
      />
    </g>
  );
}

// ─── Individual Workflow Node Card ─────────────────────────────────────────────
function WorkflowNode({
  config, position, isActive, isPlaced, members, onDragStart,
  onDoubleClick, hasNext, isDragging, canAddNext, onAddNext, onRemoveNode
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
        transform: isActive && !isDragging ? "scale(1.01)" : "scale(1)",
      }}
      onMouseDown={onDragStart}
      onDoubleClick={onDoubleClick}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 22,
          background: "#ffffff",
          border: `2px solid ${isActive ? config.color : "rgba(0,0,0,0.06)"}`,
          boxShadow: isActive
            ? `0 12px 30px ${config.color}20, 0 2px 8px rgba(0,0,0,0.04)`
            : "0 8px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        className="dark:[background:#1e293b] dark:[border-color:rgba(255,255,255,0.06)]"
      >
        {/* Node Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${config.color}10, ${config.color}05)`,
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          className="dark:[border-color:rgba(255,255,255,0.04)]"
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${config.color}20, ${config.color}40)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon style={{ width: 13, height: 13, color: config.color }} />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: config.color,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {config.label}
          </span>
          
          {/* Action indicator or clear node button */}
          {config.type !== "project" && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onRemoveNode(); }}
              className="ml-auto text-gray-300 hover:text-red-500 transition-colors p-1"
              title="Remove Node"
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* Node Body */}
        <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", justifyCenter: "center" }}>
          {config.type === "project" ? (
            <ProjectNameField color={config.color} />
          ) : (
            <div>
              {memberCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-2 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                  <p style={{ fontSize: 11, color: "#9ca3af" }}>
                    Drag & Drop or Double-Click members to add
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div style={{ display: "flex", gap: -6, overflow: "visible" }} className="avatar-group flex flex-row">
                    {members.slice(0, 4).map((m, idx) => (
                      <Avatar
                        key={m.user_id}
                        src={m.profile_picture}
                        name={m.name}
                        size="xs"
                        className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-900 shadow-sm"
                        style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: 5 - idx }}
                      />
                    ))}
                    {memberCount > 4 && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-550 dark:text-gray-400 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm" style={{ marginLeft: -8, zIndex: 1 }}>
                        +{memberCount - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-555 dark:text-gray-400 truncate max-w-[150px]">
                      {members.map(m => m.name.split(" ")[0]).join(", ")}
                    </span>
                    <span className="text-[10px] bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-gray-400 font-bold border border-gray-100 dark:border-gray-700/50">
                      {memberCount} Assigned
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Double click to edit hint */}
        {config.type !== "project" && (
          <div
            style={{
              fontSize: 9,
              color: "#94a3b8",
              textAlign: "center",
              paddingBottom: 8,
              fontStyle: "italic",
            }}
          >
            double-click to edit members list
          </div>
        )}
      </div>

      {/* Chain connector + button */}
      {canAddNext && !hasNext && isPlaced && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onAddNext(); }}
          style={{
            position: "absolute",
            right: -16,
            top: "50%",
            transform: "translateY(-50%)",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: config.color,
            border: "3px solid #fff",
            boxShadow: `0 4px 10px ${config.color}35`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 30,
            transition: "all 0.2s",
          }}
          className="hover:scale-110 active:scale-95"
          title={`Add ${NODE_CONFIGS[NODE_CONFIGS.findIndex((n) => n.type === config.type) + 1]?.label || ""}`}
        >
          <Plus style={{ width: 14, height: 14, color: "#fff" }} />
        </button>
      )}
    </div>
  );
}

// ─── Project Name Field ────────────────────────────────────────────────────────
function ProjectNameField({ color }) {
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

// ─── Restricted Role Selection Panel ───────────────────────────────────────────
function MemberPanel({ nodeType, selected, onClose, onConfirm }) {
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState(selected || []);

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then((r) => r.data.faculty),
    enabled: nodeType === "faculty",
  });
  const { data: forumData } = useQuery({
    queryKey: ["forum-members"],
    queryFn: () => listForumMembers().then((r) => r.data.members),
    enabled: nodeType === "forum",
  });
  const { data: studentsData } = useQuery({
    queryKey: ["all-students"],
    queryFn: () => listAllStudents().then((r) => r.data.students),
    enabled: nodeType === "students",
  });

  useEffect(() => {
    setLocalSelected(selected || []);
  }, [selected]);

  const getPeople = () => {
    if (nodeType === "faculty") {
      return (facultyData || []).map((f) => ({
        user_id: f.user_id, name: f.name, profile_picture: f.profile_picture,
        subtitle: f.designation, role: "faculty",
      }));
    }
    if (nodeType === "forum") {
      return (forumData || []).map((m) => ({
        user_id: m.user_id, name: m.name, profile_picture: m.profile_picture,
        subtitle: m.role, role: "forum_member",
      }));
    }
    return (studentsData || []).map((s) => ({
      user_id: s.user_id, name: s.name, profile_picture: s.profile_picture,
      subtitle: s.class_name?.replace("_", " "), role: "student",
    }));
  };

  const roleMap = { faculty: "faculty", forum: "forum_member", students: "student" };
  const currentRole = roleMap[nodeType];
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

  const panelTitle = nodeType === "faculty" ? "Choose Faculty Panel"
    : nodeType === "forum" ? "Choose Forum Panel"
    : "Choose Students Panel";

  const activeColor = nodeType === "faculty" ? "#6366F1"
    : nodeType === "forum" ? "#F59E0B"
    : "#10B981";

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

      {/* Header */}
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
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }} className="dark:text-white">
            {panelTitle}
          </h3>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            Drag member cards onto canvas or double click to assign.
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: "#f1f5f9", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyCenter: "center",
          }}
          className="dark:[background:#334155] flex items-center justify-center"
        >
          <X style={{ width: 16, height: 16, color: "#64748b" }} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "16px", flexShrink: 0, position: "relative" }}>
        <Search style={{
          position: "absolute", left: 28, top: "50%", transform: "translateY(-50%)",
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

      {/* Member Cards List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px" }} className="space-y-2">
        {people.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
            <p style={{ fontSize: 13, fontWeight: 550 }}>No results found</p>
          </div>
        ) : (
          people.map((person) => {
            const isSelected = localSelected.some((s) => s.user_id === person.user_id);
            return (
              <div
                key={person.user_id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", JSON.stringify({ person, nodeType }));
                }}
                onDoubleClick={() => toggle(person)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px", borderRadius: 16, cursor: "grab",
                  transition: "all 0.2s",
                  background: isSelected ? `${activeColor}12` : "#fff",
                  border: `2px solid ${isSelected ? activeColor : "rgba(0,0,0,0.04)"}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
                className="dark:bg-slate-800/40 dark:border-slate-800 hover:shadow-md active:cursor-grabbing hover:border-gray-200 dark:hover:border-slate-700"
              >
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0 cursor-grab" />
                <Avatar src={person.profile_picture} name={person.name} size="sm"
                  className="w-8 h-8 rounded-full shrink-0 ring-1 ring-black/5" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}
                    className="dark:text-white truncate">{person.name}</p>
                  {person.subtitle && (
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0" }} className="truncate">{person.subtitle}</p>
                  )}
                </div>
                <div
                  style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${isSelected ? activeColor : "#d1d5db"}`,
                    background: isSelected ? activeColor : "transparent",
                    display: "flex", alignItems: "center", justifyCenter: "center",
                    transition: "all 0.2s",
                  }}
                  className="flex items-center justify-center"
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
            background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
            fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff",
            fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
            boxShadow: `0 4px 12px ${activeColor}30`,
          }}
        >
          <Check style={{ width: 14, height: 14 }} />
          Confirm ({localSelected.length} selected)
        </button>
      </div>
    </div>
  );
}

// ─── Main Workflow Page Controller ─────────────────────────────────────────────
export default function ProjectWorkflowPage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const isEdit = Boolean(projectId);
  const queryClient = useQueryClient();

  // Canvas positions and placement state
  const canvasRef = useRef(null);
  const [projectName, setProjectName] = useState("");
  const [placedNodes, setPlacedNodes] = useState(["project"]); // Only Project template card initially
  const [nodePositions, setNodePositions] = useState({
    project: { x: 80, y: 200 },
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

  // Load existing project details in edit mode
  const { data: existingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingProject?.project && isEdit) {
      const proj = existingProject.project;
      setProjectName(proj.name || "");
      
      const facultyM = proj.members?.filter((m) => m.role_in_project === "faculty") || [];
      const forumM = proj.members?.filter((m) => m.role_in_project === "forum_member") || [];
      const studentM = proj.members?.filter((m) => m.role_in_project === "student") || [];

      const mapM = (arr, role) =>
        arr.map((m) => ({ user_id: m.id, name: m.name, profile_picture: m.profile_picture, role_in_project: role }));

      setMembers({
        faculty: mapM(facultyM, "faculty"),
        forum: mapM(forumM, "forum_member"),
        students: mapM(studentM, "student"),
      });

      // Place nodes representing loaded members
      const nPlaced = ["project"];
      if (facultyM.length > 0) nPlaced.push("faculty");
      if (forumM.length > 0) nPlaced.push("forum");
      if (studentM.length > 0) nPlaced.push("students");

      setPlacedNodes(nPlaced);
      
      const positions = { project: { x: 80, y: 200 } };
      nPlaced.forEach((nodeType, i) => {
        if (nodeType !== "project") {
          positions[nodeType] = { x: 80 + i * GRID_GAP, y: 200 };
        }
      });
      setNodePositions(positions);
    }
  }, [existingProject, isEdit]);

  // Open faculty panel automatically when name is first entered
  useEffect(() => {
    if (projectName.trim().length > 0 && placedNodes.length === 1 && !panelOpen && !isEdit) {
      setPanelOpen("faculty");
    }
  }, [projectName, isEdit]);

  const getNextNodeType = (currentType) => {
    const order = ["project", "faculty", "forum", "students"];
    const idx = order.indexOf(currentType);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const handleAddNext = (fromType) => {
    const nextType = getNextNodeType(fromType);
    if (!nextType || placedNodes.includes(nextType)) return;
    setPanelOpen(nextType);
  };

  const handleRemoveNode = (nodeType) => {
    setPlacedNodes((prev) => prev.filter((n) => n !== nodeType));
    const roleKey = nodeType === "faculty" ? "faculty" : nodeType === "forum" ? "forum" : "students";
    setMembers((prev) => ({ ...prev, [roleKey]: [] }));
  };

  // Node Dragging logic on canvas
  const handleDragStart = useCallback((nodeType, e) => {
    // Avoid dragging starting from input elements
    if (e.target.tagName === "INPUT") return;
    e.preventDefault();
    setActiveNode(nodeType);
    
    const currentPos = nodePositions[nodeType] || { x: 80 + placedNodes.indexOf(nodeType) * GRID_GAP, y: 200 };
    const startX = e.clientX - currentPos.x;
    const startY = e.clientY - currentPos.y;
    setDragging({ nodeType, startX, startY });
  }, [nodePositions, placedNodes]);

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

  // Drop member card onto canvas
  const handleDropMember = (person, nodeType, position) => {
    const roleKey = nodeType === "faculty" ? "faculty" : nodeType === "forum" ? "forum" : "students";
    
    setMembers((prev) => {
      const current = prev[roleKey] || [];
      if (current.some((m) => m.user_id === person.user_id)) return prev;
      return { ...prev, [roleKey]: [...current, person] };
    });

    if (!placedNodes.includes(nodeType)) {
      setPlacedNodes((prev) => [...prev, nodeType]);
      setNodePositions((prev) => ({ ...prev, [nodeType]: position }));
      
      // Auto open next panel tab
      const next = getNextNodeType(nodeType);
      if (next) {
        setTimeout(() => setPanelOpen(next), 400);
      }
    }
  };

  const handlePanelConfirm = (selectedList) => {
    setMembers((prev) => ({ ...prev, [panelOpen]: selectedList }));
    
    // Instantiate node next to preceding node if not already placed
    if (!placedNodes.includes(panelOpen) && selectedList.length > 0) {
      const order = ["project", "faculty", "forum", "students"];
      const currentIdx = order.indexOf(panelOpen);
      const prevNodeType = order[currentIdx - 1];
      const prevPos = nodePositions[prevNodeType] || { x: 80 + (currentIdx - 1) * GRID_GAP, y: 200 };
      
      const newPos = { x: prevPos.x + GRID_GAP, y: prevPos.y };
      setPlacedNodes((prev) => [...prev, panelOpen]);
      setNodePositions((prev) => ({ ...prev, [panelOpen]: newPos }));
    }

    const nextType = getNextNodeType(panelOpen);
    setPanelOpen(null);
    
    // Automatically display choose panel for next stage
    if (nextType && !placedNodes.includes(nextType) && selectedList.length > 0) {
      setTimeout(() => setPanelOpen(nextType), 300);
    }
  };

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
        status: existingProject?.project?.status || "IN_PROGRESS",
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

        {/* Badge */}
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
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const dropX = e.clientX - rect.left - NODE_W / 2;
          const dropY = e.clientY - rect.top - NODE_H / 2;

          try {
            const dataStr = e.dataTransfer.getData("text/plain");
            if (!dataStr) return;
            const payload = JSON.parse(dataStr);
            if (payload.person && payload.nodeType) {
              handleDropMember(payload.person, payload.nodeType, { x: dropX, y: dropY });
            }
          } catch (err) {
            console.error(err);
          }
        }}
      >
        {/* SVG Bezier Edges */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}
        >
          {placedNodes.slice(0, -1).map((nodeType, i) => {
            const fromConfig = NODE_CONFIGS.find((n) => n.type === nodeType);
            const toType = placedNodes[i + 1];
            const fromPos = nodePositions[nodeType] || { x: 80 + i * GRID_GAP, y: 200 };
            const toPos = nodePositions[toType] || { x: 80 + (i + 1) * GRID_GAP, y: 200 };

            return (
              <WorkflowEdge
                key={`${nodeType}-${toType}`}
                fromNode={{ x: fromPos.x, y: fromPos.y }}
                toNode={{ x: toPos.x, y: toPos.y }}
                color={fromConfig?.color || "#F05A2B"}
              />
            );
          })}
        </svg>

        {/* Render Draggable Nodes */}
        {placedNodes.map((nodeType) => {
          const config = NODE_CONFIGS.find((n) => n.type === nodeType);
          const idx = placedNodes.indexOf(nodeType);
          const position = nodePositions[nodeType] || { x: 80 + idx * GRID_GAP, y: 200 };
          const nextType = getNextNodeType(nodeType);
          const hasNext = nextType ? placedNodes.includes(nextType) : true;
          const canAddNext = nextType !== null;
          
          const nodeMembersKey = nodeType === "faculty" ? "faculty"
            : nodeType === "forum" ? "forum"
            : nodeType === "students" ? "students"
            : null;

          const isNodePlaced = nodeType !== "project"
            ? (nodeMembersKey ? members[nodeMembersKey].length > 0 : false)
            : projectName.trim().length > 0;

          return (
            <WorkflowNode
              key={nodeType}
              config={config}
              position={position}
              isActive={activeNode === nodeType}
              isPlaced={isNodePlaced}
              members={nodeMembersKey ? members[nodeMembersKey] : []}
              isDragging={dragging?.nodeType === nodeType}
              hasNext={hasNext}
              canAddNext={canAddNext}
              onDragStart={(e) => handleDragStart(nodeType, e)}
              onAddNext={() => handleAddNext(nodeType)}
              onRemoveNode={() => handleRemoveNode(nodeType)}
              onDoubleClick={() => {
                if (nodeType !== "project") setPanelOpen(nodeType);
              }}
            />
          );
        })}

        {/* Sync input field with projectName */}
        <ProjectNameSync value={projectName} onChange={setProjectName} />

        {/* Guide message */}
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
              Enter a project name to start. The member panel will open automatically to build your team.
            </p>
          </div>
        )}
      </div>

      {/* Right panel side drawer */}
      {panelOpen && (
        <MemberPanel
          nodeType={panelOpen}
          selected={members[panelOpen]}
          onClose={() => setPanelOpen(null)}
          onConfirm={handlePanelConfirm}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Sync input field value to state correctly
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
