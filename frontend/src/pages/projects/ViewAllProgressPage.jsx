import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProject, getMessages } from "../../api/projects";
import { Spinner } from "../../components/ui/Spinner";
import { Avatar } from "../../components/ui/Avatar";
import { usePageTransition } from "../../context/TransitionContext";
import { 
  ArrowLeft, Search, Calendar, ChevronDown, Filter, FileText, Image, Download, 
  TrendingUp, Award, FolderKanban, PlusCircle, AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function ViewAllProgressPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { navigateWithTransition } = usePageTransition();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [authorFilter, setAuthorFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [page, setPage] = useState(1);

  // Fetch Project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id).then(r => r.data.project),
  });

  // Fetch Progress Updates (messages)
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages-all", id, page],
    queryFn: () => getMessages(id, { page }).then(r => r.data),
  });

  const messages = messagesData?.messages || [];
  const totalPages = messagesData?.pages || 1;

  // Parse updates into structured progress records
  const parsedUpdates = useMemo(() => {
    return messages.filter(msg => !msg.is_deleted).map(msg => {
      let uData = {
        title: "Progress Update",
        summary: "",
        completion: 0,
        status: "In Progress",
        completed_this_week: "",
        next_milestone: "",
        challenges: "",
        support: ""
      };
      try {
        const parsed = JSON.parse(msg.content);
        uData = {
          title: parsed.title || "Progress Update",
          summary: parsed.summary || parsed.accomplishment || "",
          completion: typeof parsed.completion === "number" ? parsed.completion : 0,
          status: parsed.status || "In Progress",
          completed_this_week: parsed.completed_this_week || parsed.accomplishment || "",
          next_milestone: parsed.next_milestone || parsed.next || "",
          challenges: parsed.challenges || "",
          support: parsed.support || ""
        };
      } catch (e) {
        uData.summary = msg.content || "";
        uData.completed_this_week = msg.content || "";
      }
      return {
        id: msg.id,
        created_at: new Date(msg.created_at),
        dateStr: format(new Date(msg.created_at), "MMM d, yyyy · h:mm a"),
        author: msg.sender?.name || "Unknown",
        authorId: msg.sender?.id,
        avatar: msg.sender?.profile_picture,
        role: msg.sender?.role || "STUDENT",
        status: uData.status,
        title: uData.title,
        summary: uData.summary,
        completion: uData.completion,
        attachmentUrl: msg.attachment_url,
        attachmentName: msg.attachment_name,
        updateData: uData
      };
    });
  }, [messages]);

  // Extract unique authors from the parsed updates for the filters list
  const authors = useMemo(() => {
    const set = new Set();
    const list = [];
    parsedUpdates.forEach(u => {
      if (u.author && !set.has(u.author)) {
        set.add(u.author);
        list.push({ name: u.author, id: u.authorId });
      }
    });
    return list;
  }, [parsedUpdates]);

  // Filter and sort progress updates
  const filteredUpdates = useMemo(() => {
    let result = [...parsedUpdates];

    if (statusFilter !== "All") {
      result = result.filter(u => u.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (authorFilter !== "All") {
      result = result.filter(u => u.author === authorFilter);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.title.toLowerCase().includes(q) ||
        u.summary.toLowerCase().includes(q) ||
        u.author.toLowerCase().includes(q)
      );
    }

    if (sortOrder === "Newest") {
      result.sort((a, b) => b.created_at - a.created_at);
    } else {
      result.sort((a, b) => a.created_at - b.created_at);
    }

    return result;
  }, [parsedUpdates, statusFilter, authorFilter, searchQuery, sortOrder]);

  const handleBackToProject = () => {
    navigateWithTransition(`/projects/${id}`, project?.name || "Project", FolderKanban);
  };

  const getStatusBadgeColor = (status) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("complete")) return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
    if (s.includes("progress")) return "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30";
    if (s.includes("review")) return "bg-blue-50 dark:bg-blue-950/20 text-blue-655 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
    if (s.includes("hold")) return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-100 dark:border-amber-900/30";
    return "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  };

  const getAvatarBg = (name = "A") => {
    const char = name.charAt(0).toUpperCase();
    const colors = {
      S: "bg-indigo-600 text-white",
      P: "bg-emerald-600 text-white",
      Y: "bg-amber-600 text-white",
      Z: "bg-rose-600 text-white"
    };
    return colors[char] || "bg-indigo-500 text-white";
  };

  if (projectLoading || messagesLoading) return <Spinner />;

  return (
    <div className="flex flex-col min-h-screen max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
      
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-2 shrink-0">
        <div
          onClick={handleBackToProject}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-655 hover:text-indigo-700 dark:hover:text-indigo-400 cursor-pointer transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Project Monitor
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 leading-none">Progress History</h1>
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">for {project?.name}</span>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search progress updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-955 text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          {/* Author Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Author</span>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-955 text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">All Authors</option>
              {authors.map(a => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sort</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-955 text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Newest">Newest First</option>
              <option value="Oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Progress Updates Feed ─── */}
      <div className="space-y-4">
        {filteredUpdates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center p-6">
            <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-855 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Progress Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              This project hasn't received any progress updates matching your filters.
            </p>
            <button
              onClick={() => navigate(`/projects/${id}?add=true`)}
              className="mt-5 px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              Add First Progress
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUpdates.map((update) => (
              <div 
                key={update.id}
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-sm transition-all"
              >
                {/* Top author row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    {update.avatar ? (
                      <img src={update.avatar} alt={update.author} className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/10" />
                    ) : (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${getAvatarBg(update.author)}`}>
                        {update.author.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white leading-none">{update.author}</span>
                        <span className="text-[9px] font-black uppercase bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-150/40 dark:border-indigo-900/30 leading-none scale-95">
                          {update.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold mt-1.5 block leading-none">{update.dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none ${getStatusBadgeColor(update.status)}`}>
                      {update.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-450 dark:text-slate-505 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-805">
                      {update.completion}% Complete
                    </span>
                  </div>
                </div>

                {/* Content section */}
                <div className="space-y-3 pl-1 font-sans">
                  <h3 className="text-sm font-bold text-slate-850 dark:text-white leading-snug">{update.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium whitespace-pre-wrap">{update.summary}</p>
                </div>

                {/* Sub details block */}
                {(update.updateData.completed_this_week || update.updateData.next_milestone || update.updateData.challenges || update.updateData.support) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-105 dark:border-slate-800/60 text-xs font-medium">
                    {update.updateData.completed_this_week && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-black text-emerald-655 dark:text-emerald-400 uppercase tracking-wider block">Completed</span>
                        <p className="text-slate-550 dark:text-slate-400 leading-relaxed pl-0.5">{update.updateData.completed_this_week}</p>
                      </div>
                    )}
                    {update.updateData.next_milestone && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Next Milestone</span>
                        <p className="text-slate-550 dark:text-slate-400 leading-relaxed pl-0.5">{update.updateData.next_milestone}</p>
                      </div>
                    )}
                    {update.updateData.challenges && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-black text-rose-600 dark:text-rose-455 uppercase tracking-wider block">Challenges & Blockers</span>
                        <p className="text-slate-550 dark:text-slate-400 leading-relaxed pl-0.5">{update.updateData.challenges}</p>
                      </div>
                    )}
                    {update.updateData.support && (
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-black text-amber-600 dark:text-amber-455 uppercase tracking-wider block">Support Needed</span>
                        <p className="text-slate-550 dark:text-slate-400 leading-relaxed pl-0.5">{update.updateData.support}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments preview */}
                {update.attachmentUrl && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-2">Attachments</span>
                    <a
                      href={update.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl hover:border-indigo-405 dark:hover:border-indigo-900 transition-all max-w-[320px]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        {update.attachmentName?.toLowerCase().endsWith(".pdf") ? (
                          <FileText className="w-4 h-4" />
                        ) : ["png", "jpg", "jpeg", "webp"].some(ext => update.attachmentName?.toLowerCase().endsWith(ext)) ? (
                          <Image className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-205 truncate leading-tight">{update.attachmentName}</span>
                      </div>
                      <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 shrink-0">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
