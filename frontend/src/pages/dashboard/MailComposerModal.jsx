import React, { useState, useEffect, useRef } from "react";
import { 
  X, Mail, Search, Loader2, CheckCircle2, AlertCircle, 
  Bold, Italic, Underline, List, ListOrdered, Link2, 
  Image as ImageIcon, Smile, FileText, File, Trash2, 
  Eye, ArrowLeft, ChevronDown, Check, Send, Paperclip
} from "lucide-react";
import { getRecipients, sendMail } from "../../api/mail";
import { useAuth } from "../../context/AuthContext";
import clsx from "clsx";

export default function MailComposerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  
  // Basic states
  const [recipientType, setRecipientType] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  
  // Custom selection states
  const [recipientsList, setRecipientsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  
  // View states
  const [isPreviewing, setIsPreviewing] = useState(false); // Desktop preview panel
  const [mobileTab, setMobileTab] = useState("compose");    // Mobile compose/preview tabs
  const [showMobileRecipientsSheet, setShowMobileRecipientsSheet] = useState(false);
  const [showMobileCustomRecipientsSheet, setShowMobileCustomRecipientsSheet] = useState(false);
  
  // Status states
  const [isSending, setIsSending] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: "", text: "" });
  
  // Drop zones state
  const [imageDrag, setImageDrag] = useState(false);
  const [pdfDrag, setPdfDrag] = useState(false);
  const [docDrag, setDocDrag] = useState(false);
  
  // Emoji Picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Refs
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const docInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch recipients list and restore draft on mount/open
  useEffect(() => {
    if (isOpen) {
      // Reset state
      setSubject("");
      setBody("");
      setRecipientType("all");
      setSelectedEmails(new Set());
      setAttachments([]);
      setIsPreviewing(false);
      setMobileTab("compose");
      setAlertMsg({ type: "", text: "" });

      // Fetch contacts
      setIsLoadingRecipients(true);
      getRecipients()
        .then((res) => {
          setRecipientsList(res.data.recipients || []);
        })
        .catch((err) => {
          console.error("Failed to load contacts list", err);
          setAlertMsg({ type: "error", text: "Failed to load recipient contacts list." });
        })
        .finally(() => setIsLoadingRecipients(false));

      // Restore draft if any
      const savedSubject = localStorage.getItem("hive_draft_subject");
      const savedBody = localStorage.getItem("hive_draft_body");
      const savedRecipientType = localStorage.getItem("hive_draft_recipient_type");
      
      if (savedSubject) setSubject(savedSubject);
      if (savedRecipientType) setRecipientType(savedRecipientType);
      if (savedBody) {
        setBody(savedBody);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = savedBody;
          }
        }, 100);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Formatting helper
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Helper to get file icons
  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    if (ext === "pdf") {
      return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    }
    return <File className="w-4 h-4 text-blue-500 shrink-0" />;
  };

  // Drag & drop file actions
  const handleFileDrop = (e, fileType) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files, fileType);
  };

  const addFiles = (files, allowedType) => {
    const newFiles = [];
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      
      if (allowedType === "image" && !file.type.startsWith("image/")) {
        setAlertMsg({ type: "error", text: "Only image files are allowed in this card." });
        continue;
      }
      if (allowedType === "pdf" && ext !== "pdf") {
        setAlertMsg({ type: "error", text: "Only PDF files are allowed in this card." });
        continue;
      }
      if (allowedType === "document" && !["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)) {
        setAlertMsg({ type: "error", text: "Only document files (.doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt) are allowed." });
        continue;
      }

      newFiles.push({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.type,
        fileObject: file
      });
    }
    
    if (newFiles.length > 0) {
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  // Contacts Filtering
  const filteredRecipients = recipientsList.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const facultyContacts = filteredRecipients.filter(r => r.role === "FACULTY" || r.role === "HOD");
  const studentContacts = filteredRecipients.filter(r => r.role === "STUDENT");

  const toggleSelectEmail = (email) => {
    const updated = new Set(selectedEmails);
    if (updated.has(email)) {
      updated.delete(email);
    } else {
      updated.add(email);
    }
    setSelectedEmails(updated);
  };

  const handleSelectAll = () => {
    const updated = new Set(selectedEmails);
    filteredRecipients.forEach(r => {
      if (r.email) updated.add(r.email);
    });
    setSelectedEmails(updated);
  };

  const handleClearAll = () => {
    const updated = new Set(selectedEmails);
    filteredRecipients.forEach(r => {
      updated.delete(r.email);
    });
    setSelectedEmails(updated);
  };

  // Rich Text Editor input handler
  const handleEditorInput = () => {
    setBody(editorRef.current ? editorRef.current.innerHTML : "");
  };

  const handleFormat = (command, value = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      handleEditorInput();
    }
  };

  const insertEmoji = (emoji) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand("insertText", false, emoji);
      handleEditorInput();
      setShowEmojiPicker(false);
    }
  };

  // Dynamic Reach Calculations
  const allFacultyCount = recipientsList.filter(r => r.role === "FACULTY" || r.role === "HOD").length;
  const allStudentCount = recipientsList.filter(r => r.role === "STUDENT").length;

  let reachFaculty = 0;
  let reachStudents = 0;

  if (recipientType === "all") {
    reachFaculty = allFacultyCount;
    reachStudents = allStudentCount;
  } else if (recipientType === "faculty") {
    reachFaculty = allFacultyCount;
  } else if (recipientType === "students") {
    reachStudents = allStudentCount;
  } else if (recipientType === "custom") {
    recipientsList.forEach(r => {
      if (selectedEmails.has(r.email)) {
        if (r.role === "FACULTY" || r.role === "HOD") reachFaculty++;
        else if (r.role === "STUDENT") reachStudents++;
      }
    });
  }

  const reachTotal = reachFaculty + reachStudents;

  // Send action
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!subject.trim()) {
      setAlertMsg({ type: "error", text: "Please enter a subject line." });
      setMobileTab("compose");
      return;
    }
    if (!body.trim() || body === "<br>") {
      setAlertMsg({ type: "error", text: "Please enter message body content." });
      setMobileTab("compose");
      return;
    }
    if (recipientType === "custom" && selectedEmails.size === 0) {
      setAlertMsg({ type: "error", text: "Please select at least one recipient." });
      setMobileTab("compose");
      return;
    }

    setIsSending(true);
    setAlertMsg({ type: "", text: "" });

    const payload = {
      subject,
      body,
      recipient_type: recipientType,
      selected_emails: recipientType === "custom" ? Array.from(selectedEmails) : [],
    };

    try {
      const res = await sendMail(payload);
      setAlertMsg({
        type: "success",
        text: `Message successfully sent to ${res.data.recipient_count} recipient(s).`,
      });
      // Clear inputs & local drafts
      setSubject("");
      setBody("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      setSelectedEmails(new Set());
      setAttachments([]);
      localStorage.removeItem("hive_draft_subject");
      localStorage.removeItem("hive_draft_body");
      localStorage.removeItem("hive_draft_recipient_type");
      
      // Auto close after 2s
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to send message. Verify connection.";
      setAlertMsg({ type: "error", text: errorMsg });
    } finally {
      setIsSending(false);
      setIsPreviewing(false);
    }
  };

  // Draft action
  const handleSaveDraft = () => {
    localStorage.setItem("hive_draft_subject", subject);
    localStorage.setItem("hive_draft_body", body);
    localStorage.setItem("hive_draft_recipient_type", recipientType);
    setAlertMsg({ type: "success", text: "Draft saved to HIVE successfully." });
  };

  const getRecipientSummaryText = () => {
    if (recipientType === "all") return "Everyone (All Faculty & Students)";
    if (recipientType === "faculty") return "Faculty Members Only";
    if (recipientType === "students") return "Students Only";
    return `Selected Individuals (${selectedEmails.size} selected)`;
  };

  const popularEmojis = ["😊", "😂", "👍", "❤️", "🎉", "🔥", "📢", "📌", "✅", "💡", "🚀", "👋", "👀", "💻", "📅"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-fade-in">
      
      {/* ========================================== */}
      {/*          DESKTOP CONTAINER LAYOUT          */}
      {/* ========================================== */}
      <div className="hidden lg:flex relative w-full max-w-[1050px] h-[720px] max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex-col overflow-hidden transform transition-all animate-slide-up">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-650 dark:text-indigo-455" />
              In-App Mail
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Send emails to faculty and students directly from HIVE.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPreviewing(true)}
              className="px-4 py-2 text-xs font-bold text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Mail
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body Container */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          
          <div className="grid grid-cols-10 h-full p-6 gap-6 overflow-y-auto">
            
            {/* LEFT COLUMN: Compose Form (70%) */}
            <div className="col-span-7 flex flex-col space-y-5 min-h-0 pr-1">
              
              {/* Alert message display */}
              {alertMsg.text && (
                <div className={clsx(
                  "p-3 rounded-xl border flex items-start gap-2.5 text-xs font-semibold shrink-0 transition-all",
                  alertMsg.type === "success" 
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400" 
                    : "bg-rose-50 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-455"
                )}>
                  {alertMsg.type === "success" ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1">{alertMsg.text}</span>
                  <button onClick={() => setAlertMsg({ type: "", text: "" })} className="text-slate-400 hover:text-slate-650">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Subject line input */}
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Subject</span>
                <input
                  type="text"
                  placeholder="Enter mail subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 py-2.5 text-base font-bold text-slate-805 dark:text-white placeholder-slate-400 transition-colors"
                />
              </div>

              {/* Message content area */}
              <div className="flex flex-col space-y-1 flex-1 min-h-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Message</span>
                
                <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/20 dark:bg-slate-950/10 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all min-h-0">
                  
                  {/* Text editor toolbar */}
                  <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("bold")}
                        title="Bold"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("italic")}
                        title="Italic"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("underline")}
                        title="Underline"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                      
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                      
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("insertUnorderedList")}
                        title="Bullet List"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("insertOrderedList")}
                        title="Numbered List"
                        className="p-1.5 text-slate-500 hover:text-slate-805 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                      
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const url = prompt("Enter Link URL (e.g. https://example.com):");
                          if (url) handleFormat("createLink", url);
                        }}
                        title="Add Link"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const url = prompt("Enter Image URL:");
                          if (url) handleFormat("insertImage", url);
                        }}
                        title="Insert Image Link"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Emoji Trigger */}
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Insert Emoji"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-850 rounded-lg transition-colors"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      
                      {showEmojiPicker && (
                        <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2.5 grid grid-cols-5 gap-1.5 w-48 z-50 animate-fade-in">
                          {popularEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => insertEmoji(emoji)}
                              className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Rich Editor contentEditable Area */}
                  <div className="relative flex-1 min-h-[250px] overflow-y-auto">
                    {body.trim() === "" && (
                      <div className="absolute top-4 left-4 text-slate-400 dark:text-slate-500 pointer-events-none select-none text-xs font-semibold">
                        Write your announcement message here...
                      </div>
                    )}
                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorInput}
                      className="w-full h-full min-h-[250px] p-4 focus:outline-none text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-sans prose dark:prose-invert max-w-none"
                    />
                  </div>

                </div>
              </div>

              {/* Attachments Section */}
              <div className="flex flex-col space-y-1.5 shrink-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Attachments</span>
                
                {/* 3 Upload cards */}
                <div className="grid grid-cols-3 gap-3.5">
                  
                  {/* Image card */}
                  <div
                    onClick={() => imageInputRef.current.click()}
                    onDragOver={(e) => { e.preventDefault(); setImageDrag(true); }}
                    onDragLeave={() => setImageDrag(false)}
                    onDrop={(e) => { setImageDrag(false); handleFileDrop(e, "image"); }}
                    className={clsx(
                      "flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-850/10",
                      imageDrag ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10" : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(Array.from(e.target.files), "image")}
                    />
                    <ImageIcon className="w-5 h-5 text-indigo-555 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">Images</span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500">Drag/Click PNG, JPG</span>
                  </div>

                  {/* PDF card */}
                  <div
                    onClick={() => pdfInputRef.current.click()}
                    onDragOver={(e) => { e.preventDefault(); setPdfDrag(true); }}
                    onDragLeave={() => setPdfDrag(false)}
                    onDrop={(e) => { setPdfDrag(false); handleFileDrop(e, "pdf"); }}
                    className={clsx(
                      "flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-850/10",
                      pdfDrag ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10" : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(Array.from(e.target.files), "pdf")}
                    />
                    <FileText className="w-5 h-5 text-indigo-555 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">PDF</span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500">Drag/Click Document</span>
                  </div>

                  {/* Documents card */}
                  <div
                    onClick={() => docInputRef.current.click()}
                    onDragOver={(e) => { e.preventDefault(); setDocDrag(true); }}
                    onDragLeave={() => setDocDrag(false)}
                    onDrop={(e) => { setDocDrag(false); handleFileDrop(e, "document"); }}
                    className={clsx(
                      "flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-850/10",
                      docDrag ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10" : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <input
                      ref={docInputRef}
                      type="file"
                      accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(Array.from(e.target.files), "document")}
                    />
                    <Paperclip className="w-5 h-5 text-indigo-555 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-1">Documents</span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500">DOCX, XLSX, TXT</span>
                  </div>

                </div>

                {/* Uploaded attachment chips list */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2.5">
                    {attachments.map((file) => (
                      <div 
                        key={file.id} 
                        className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-850 rounded-xl text-[10px] font-semibold text-slate-700 dark:text-slate-350"
                      >
                        {getFileIcon(file.name)}
                        <span className="truncate max-w-[120px]">{file.name}</span>
                        <span className="text-slate-400 text-[8px]">({formatFileSize(file.size)})</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.id)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-850 rounded-full transition-colors"
                        >
                          <X className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Recipients & reach (30%) */}
            <div className="col-span-3 flex flex-col space-y-5 min-h-0 pl-3 border-l border-slate-100 dark:border-slate-850/60">
              
              <div className="flex flex-col space-y-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recipients</span>
                
                {/* 4 select cards */}
                <div className="space-y-2">
                  {[
                    { id: "all", label: "Everyone", desc: "All HIVE users" },
                    { id: "faculty", label: "Faculty", desc: "Faculty members only" },
                    { id: "students", label: "Students", desc: "Student body only" },
                    { id: "custom", label: "Selected Individuals", desc: "Choose custom contacts" }
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setRecipientType(opt.id)}
                      className={clsx(
                        "p-3.5 border rounded-xl cursor-pointer flex items-center justify-between transition-all select-none hover:border-slate-350 dark:hover:border-slate-750",
                        recipientType === opt.id 
                          ? "border-indigo-500 bg-indigo-50/10 dark:border-indigo-500 dark:bg-indigo-950/10" 
                          : "border-slate-200 dark:border-slate-800"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-805 dark:text-slate-200">{opt.label}</div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.2">{opt.desc}</div>
                      </div>
                      
                      {/* Radio dot */}
                      <div className={clsx(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                        recipientType === opt.id 
                          ? "border-indigo-500 bg-indigo-500 text-white" 
                          : "border-slate-300 dark:border-slate-700"
                      )}>
                        {recipientType === opt.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smooth Expansion when Selected Individuals is selected */}
              {recipientType === "custom" && (
                <div className="flex flex-col space-y-2.5 flex-1 min-h-0 bg-slate-50/20 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl animate-fade-in">
                  
                  {/* Search Bar */}
                  <div className="relative shrink-0">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-450 px-1 select-none font-sans shrink-0">
                    <button type="button" onClick={handleSelectAll} className="hover:text-indigo-650">Select All</button>
                    <span className="text-slate-200 dark:text-slate-800">|</span>
                    <button type="button" onClick={handleClearAll} className="hover:text-indigo-650">Clear All</button>
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5">
                    {isLoadingRecipients ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Faculty list */}
                        {facultyContacts.length > 0 && (
                          <div>
                            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1">
                              Faculty & HOD ({facultyContacts.length})
                            </div>
                            <div className="space-y-1">
                              {facultyContacts.map(rec => (
                                <label key={rec.id} className="flex items-center gap-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/20 px-1 rounded-lg cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedEmails.has(rec.email)}
                                    onChange={() => toggleSelectEmail(rec.email)}
                                    className="rounded border-slate-200 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{rec.name}</div>
                                    <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.2">{rec.email}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Students list */}
                        {studentContacts.length > 0 && (
                          <div>
                            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 px-1">
                              Students ({studentContacts.length})
                            </div>
                            <div className="space-y-1">
                              {studentContacts.map(rec => (
                                <label key={rec.id} className="flex items-center gap-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/20 px-1 rounded-lg cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedEmails.has(rec.email)}
                                    onChange={() => toggleSelectEmail(rec.email)}
                                    className="rounded border-slate-200 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{rec.name}</div>
                                    <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.2">{rec.email}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {filteredRecipients.length === 0 && (
                          <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                            No contacts match search
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Selected items chips list */}
                  {selectedEmails.size > 0 && (
                    <div className="max-h-20 overflow-y-auto border-t border-slate-150 dark:border-slate-800 pt-2 flex flex-wrap gap-1">
                      {Array.from(selectedEmails).map((email) => {
                        const contact = recipientsList.find(r => r.email === email);
                        return (
                          <div key={email} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-750 dark:text-indigo-400 rounded-lg text-[9px] font-bold">
                            <span className="truncate max-w-[80px]">{contact ? contact.name : email}</span>
                            <button
                              type="button"
                              onClick={() => toggleSelectEmail(email)}
                              className="hover:bg-indigo-100 dark:hover:bg-indigo-900 p-0.5 rounded-full"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

              {/* Dynamic Estimated Reach Card */}
              <div className="flex flex-col space-y-1 px-0.5 mt-auto pt-4 shrink-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estimated Reach</span>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-950/25 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-sm text-xs font-semibold text-slate-650 dark:text-slate-400 space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Faculty</span>
                    <span className="text-slate-800 dark:text-slate-200 font-black">{reachFaculty}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Students</span>
                    <span className="text-slate-800 dark:text-slate-200 font-black">{reachStudents}</span>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-slate-800/80 my-1.5" />
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-white">
                    <span>Total Target</span>
                    <span className="text-indigo-650 dark:text-indigo-400 font-black text-sm">{reachTotal} recipients</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Desktop Preview Slide-in Panel */}
          <div className={clsx(
            "absolute inset-0 z-40 bg-white dark:bg-slate-900 flex flex-col transition-transform duration-300 ease-out",
            isPreviewing ? "translate-x-0" : "translate-x-full"
          )}>
            {/* Preview Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20 shrink-0">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">Email Preview</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">This is how the email will appear in user inboxes.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPreviewing(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl transition-all"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Mail
                </button>
              </div>
            </div>
            
            {/* Preview Body Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950/40">
              <div className="max-w-[620px] mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-855 overflow-hidden">
                
                {/* HIVE Announcement header card */}
                <div className="bg-gradient-to-r from-indigo-650 to-indigo-500 dark:from-indigo-700 dark:to-indigo-600 p-6 text-center text-white">
                  <h1 className="text-lg font-black tracking-tight">HIVE Department Announcement</h1>
                  <div className="inline-block mt-2.5 px-3 py-1 bg-white/20 rounded-full text-[9px] font-black tracking-wider uppercase">
                    Sent by {user?.name || "Administrator"} ({user?.role || "HOD"})
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Subject */}
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Subject</span>
                    <h2 className="text-base font-black text-slate-850 dark:text-slate-150 mt-0.5">{subject || "(No Subject)"}</h2>
                  </div>
                  
                  {/* Rich HTML body rendering */}
                  <div 
                    className="text-xs leading-relaxed text-slate-705 dark:text-slate-350 min-h-[160px] whitespace-pre-wrap font-sans prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: body || "<p class='text-slate-400 italic font-medium'>No message content provided.</p>" }}
                  />

                  {/* Recipients details */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Recipients</span>
                    <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {getRecipientSummaryText()}
                    </div>
                  </div>

                  {/* Attachments preview */}
                  {attachments.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Attachments ({attachments.length})</span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {attachments.map((file) => (
                          <div key={file.id} className="flex items-center gap-2 p-2 bg-slate-50/50 dark:bg-slate-805/20 border border-slate-150 dark:border-slate-850 rounded-xl text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                            {getFileIcon(file.name)}
                            <span className="truncate flex-1">{file.name}</span>
                            <span className="text-slate-455 dark:text-slate-500 shrink-0">({formatFileSize(file.size)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* HIVE footer card */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 border-t border-slate-150 dark:border-slate-800/80 text-center text-[10px] text-slate-450 dark:text-slate-500">
                  <p>This message was sent to you from the HIVE Academic Management Board.</p>
                  <p className="mt-1 font-bold text-slate-500 dark:text-slate-400">Do not reply directly to this email.</p>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* Desktop Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-750 dark:text-slate-455 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 text-xs font-bold text-slate-655 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors border border-slate-250 dark:border-slate-750 rounded-xl bg-white dark:bg-slate-900"
            >
              Save Draft
            </button>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsPreviewing(true)}
              className="px-4 py-2 text-xs font-bold text-slate-650 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors animate-pulse"
            >
              Preview
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Mail
            </button>
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/*           MOBILE PORTAL CONTAINER          */}
      {/* ========================================== */}
      <div className="flex lg:hidden fixed inset-0 z-50 bg-white dark:bg-slate-900 flex-col overflow-hidden w-full h-full select-none animate-slide-up">
        
        {/* Mobile Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-650">
              <ArrowLeft className="w-5 h-5 text-slate-750 dark:text-slate-300" />
            </button>
            <span className="text-xs font-black text-slate-850 dark:text-white tracking-tight">In-App Mail</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileTab(mobileTab === "compose" ? "preview" : "compose")}
              className="px-3 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl transition-all"
            >
              {mobileTab === "compose" ? "Preview" : "Compose"}
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-950/10">
          <button
            onClick={() => setMobileTab("compose")}
            className={clsx(
              "flex-1 py-3 text-center text-xs font-black transition-all border-b-2",
              mobileTab === "compose" 
                ? "border-indigo-650 text-indigo-650 dark:border-indigo-500 dark:text-indigo-400" 
                : "border-transparent text-slate-400 dark:text-slate-500"
            )}
          >
            Compose
          </button>
          <button
            onClick={() => setMobileTab("preview")}
            className={clsx(
              "flex-1 py-3 text-center text-xs font-black transition-all border-b-2",
              mobileTab === "preview" 
                ? "border-indigo-650 text-indigo-650 dark:border-indigo-500 dark:text-indigo-400" 
                : "border-transparent text-slate-400 dark:text-slate-500"
            )}
          >
            Preview
          </button>
        </div>

        {/* Tab content area */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          
          {/* 1. COMPOSE TAB */}
          {mobileTab === "compose" && (
            <div className="h-full overflow-y-auto p-4 space-y-4 pb-24">
              
              {/* Alert displays */}
              {alertMsg.text && (
                <div className={clsx(
                  "p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold shrink-0 transition-all",
                  alertMsg.type === "success" 
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400" 
                    : "bg-rose-50 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-455"
                )}>
                  <span className="flex-1">{alertMsg.text}</span>
                  <button onClick={() => setAlertMsg({ type: "", text: "" })} className="text-slate-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Mobile Subject */}
              <div className="flex flex-col space-y-1">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Subject</span>
                <input
                  type="text"
                  placeholder="Enter mail subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 py-2 text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Mobile Editor */}
              <div className="flex flex-col space-y-1.5 flex-1 min-h-[300px]">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Message</span>
                
                <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-850 rounded-2xl bg-slate-50/10 dark:bg-slate-950/10 min-h-[250px]">
                  
                  {/* Floating-style toolbar */}
                  <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-t-2xl">
                    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("bold")}
                        className="p-1.5 text-slate-500 dark:text-slate-400 rounded-lg"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("italic")}
                        className="p-1.5 text-slate-500 dark:text-slate-400 rounded-lg"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("underline")}
                        className="p-1.5 text-slate-500 dark:text-slate-400 rounded-lg"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleFormat("insertUnorderedList")}
                        className="p-1.5 text-slate-500 dark:text-slate-400 rounded-lg"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertEmoji("😊")}
                      className="p-1.5 text-slate-500 dark:text-slate-400"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative flex-1 min-h-[200px]">
                    {body.trim() === "" && (
                      <div className="absolute top-3.5 left-3.5 text-slate-400 pointer-events-none select-none text-xs font-semibold">
                        Write your message body here...
                      </div>
                    )}
                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorInput}
                      className="w-full h-full min-h-[200px] p-3.5 focus:outline-none text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-sans font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Compact Mobile Recipient Selector */}
              <div className="flex flex-col space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recipients</span>
                
                <button
                  type="button"
                  onClick={() => setShowMobileRecipientsSheet(true)}
                  className="w-full p-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-850 dark:text-slate-200 bg-slate-50/20 dark:bg-slate-950/20"
                >
                  <span className="truncate">
                    {recipientType === "all" && "Everyone (All Users)"}
                    {recipientType === "faculty" && "Faculty Members"}
                    {recipientType === "students" && "Students Only"}
                    {recipientType === "custom" && `Selected Individuals (${selectedEmails.size} selected)`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                
                {/* Secondary Select Individuals checklist button */}
                {recipientType === "custom" && (
                  <button
                    type="button"
                    onClick={() => setShowMobileCustomRecipientsSheet(true)}
                    className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-[10px] font-black"
                  >
                    Edit Individual Recipient List
                  </button>
                )}
              </div>

              {/* Compact Reach pill */}
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                <span>Reach:</span>
                <span>Faculty: {reachFaculty}  •  Students: {reachStudents}  •  Total: <b className="text-indigo-650 dark:text-indigo-400">{reachTotal}</b></span>
              </div>

              {/* Compact Mobile Attachments row */}
              <div className="flex flex-col space-y-2">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Attachments</span>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current.click()}
                    className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-355 flex items-center justify-center gap-1 bg-white dark:bg-slate-900"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" /> Image
                  </button>
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current.click()}
                    className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-355 flex items-center justify-center gap-1 bg-white dark:bg-slate-900"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-500" /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => docInputRef.current.click()}
                    className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-355 flex items-center justify-center gap-1 bg-white dark:bg-slate-900"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500" /> Docs
                  </button>
                </div>

                {/* Horizontal scrolling attached files */}
                {attachments.length > 0 && (
                  <div className="flex overflow-x-auto gap-2 py-1 scrollbar-hide shrink-0">
                    {attachments.map((file) => (
                      <div 
                        key={file.id}
                        className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-xl text-[9px] font-bold text-slate-700 dark:text-slate-300 shrink-0"
                      >
                        {getFileIcon(file.name)}
                        <span className="truncate max-w-[90px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.id)}
                          className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded-full"
                        >
                          <X className="w-2.5 h-2.5 text-slate-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 2. PREVIEW TAB */}
          {mobileTab === "preview" && (
            <div className="h-full overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950/40 pb-24">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-850 overflow-hidden">
                <div className="bg-indigo-650 p-4 text-center text-white">
                  <h1 className="text-sm font-black tracking-tight">HIVE Department Announcement</h1>
                  <span className="text-[8px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full mt-1.5 inline-block uppercase">
                    By {user?.name || "Administrator"} ({user?.role || "HOD"})
                  </span>
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Subject</span>
                    <h2 className="text-sm font-black text-slate-850 dark:text-slate-155 mt-0.5">{subject || "(No Subject)"}</h2>
                  </div>
                  
                  <div 
                    className="text-xs leading-relaxed text-slate-750 dark:text-slate-350 min-h-[140px] whitespace-pre-wrap font-sans prose dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: body || "<p class='text-slate-400 italic'>No message content provided.</p>" }}
                  />

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Recipients</span>
                    <div className="text-[9px] font-bold text-slate-805 dark:text-slate-200 mt-0.5">
                      {getRecipientSummaryText()}
                    </div>
                  </div>

                  {attachments.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Attachments ({attachments.length})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {attachments.map((file) => (
                          <div key={file.id} className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-850 rounded-lg text-[9px] font-bold text-slate-700 dark:text-slate-355">
                            {getFileIcon(file.name)}
                            <span className="truncate max-w-[100px]">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-150 dark:border-slate-800/80 text-center text-[9px] text-slate-400">
                  <p>This message was sent to you from the HIVE Academic Management Board.</p>
                  <p className="mt-0.5 font-bold">Do not reply directly to this email.</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Mobile Sticky Footer Action Bar */}
        <div className="absolute bottom-0 inset-x-0 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-150 dark:border-slate-800/80 flex items-center justify-between z-20 select-none">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-550"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="px-3.5 py-2 text-xs font-bold text-slate-655 border border-slate-250 dark:border-slate-750 rounded-xl bg-white dark:bg-slate-900"
            >
              Save Draft
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl flex items-center gap-1"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
            </button>
          </div>
        </div>

        {/* Mobile Recipient Choice Bottom Sheet */}
        {showMobileRecipientsSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-2xl max-h-[80vh] flex flex-col p-5 space-y-4 animate-slide-up">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-805">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Select Recipient Group</h3>
                <button onClick={() => setShowMobileRecipientsSheet(false)} className="p-1 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                {[
                  { id: "all", label: "Everyone", desc: "Send to all students and faculty" },
                  { id: "faculty", label: "Faculty Only", desc: "Send to registered faculty members" },
                  { id: "students", label: "Students Only", desc: "Send to active students" },
                  { id: "custom", label: "Selected Individuals", desc: "Search and select specific contacts" }
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setRecipientType(opt.id);
                      setShowMobileRecipientsSheet(false);
                      if (opt.id === "custom") {
                        setShowMobileCustomRecipientsSheet(true);
                      }
                    }}
                    className={clsx(
                      "p-3.5 border rounded-2xl cursor-pointer flex items-center justify-between transition-all",
                      recipientType === opt.id ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/15" : "border-slate-200 dark:border-slate-800"
                    )}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-850 dark:text-slate-200">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{opt.desc}</div>
                    </div>
                    <div className={clsx(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                      recipientType === opt.id ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-350 dark:border-slate-700"
                    )}>
                      {recipientType === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Custom Recipients Checklist Sheet */}
        {showMobileCustomRecipientsSheet && (
          <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col animate-slide-up">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/20">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowMobileCustomRecipientsSheet(false)} className="p-1 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-slate-750 dark:text-slate-300" />
                </button>
                <span className="text-xs font-black text-slate-850 dark:text-white">Select Contacts ({selectedEmails.size})</span>
              </div>
              <button
                onClick={() => setShowMobileCustomRecipientsSheet(false)}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black"
              >
                Done
              </button>
            </div>
            
            <div className="p-4 flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4">
              
              {/* Search */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-855 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold px-1 text-slate-455 select-none shrink-0">
                <button type="button" onClick={handleSelectAll} className="hover:text-indigo-650">Select All</button>
                <span>|</span>
                <button type="button" onClick={handleClearAll} className="hover:text-indigo-650">Clear All</button>
              </div>

              {/* checklist scroll list */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
                {filteredRecipients.length > 0 ? (
                  filteredRecipients.map((rec) => (
                    <label
                      key={rec.id}
                      className="flex items-center gap-3 py-3.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(rec.email)}
                        onChange={() => toggleSelectEmail(rec.email)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-655 focus:ring-indigo-500 w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{rec.name}</div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-500 truncate mt-0.2">{rec.email}</div>
                      </div>
                      <span className="uppercase text-[8px] font-black text-slate-500 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded shrink-0 bg-slate-50 dark:bg-slate-800/30">
                        {rec.role}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs font-semibold text-slate-400">
                    No contacts match search query
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
