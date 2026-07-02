import React, { useState, useEffect } from "react";
import { 
  X, Mail, Users, CheckCircle2, AlertCircle, Search, 
  Loader2, Eye, BookOpen, Copy, Check, Info
} from "lucide-react";
import { getSmtpStatus, getRecipients, sendMail } from "../../api/mail";

export default function MailComposerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("compose");
  const [recipientType, setRecipientType] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  
  // Selection states for custom recipients
  const [recipientsList, setRecipientsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  
  // SMTP Status state
  const [smtpStatus, setSmtpStatus] = useState({ configured: false, smtp_user: "", smtp_host: "" });
  const [isLoadingSmtp, setIsLoadingSmtp] = useState(false);
  
  // Action states
  const [isSending, setIsSending] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: "", text: "" }); // 'success' or 'error'

  // Load SMTP status and recipient list when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset composer
      setSubject("");
      setBody("");
      setRecipientType("all");
      setSelectedEmails(new Set());
      setAlertMsg({ type: "", text: "" });
      setActiveTab("compose");
      
      // Fetch SMTP status
      setIsLoadingSmtp(true);
      getSmtpStatus()
        .then((res) => {
          setSmtpStatus(res.data);
        })
        .catch((err) => {
          console.error("Failed to load SMTP status", err);
        })
        .finally(() => setIsLoadingSmtp(false));
    }
  }, [isOpen]);

  // Load recipients list when custom is chosen
  useEffect(() => {
    if (isOpen && recipientType === "custom" && recipientsList.length === 0) {
      setIsLoadingRecipients(true);
      getRecipients()
        .then((res) => {
          setRecipientsList(res.data.recipients || []);
        })
        .catch((err) => {
          console.error("Failed to fetch recipients list", err);
          setAlertMsg({ type: "error", text: "Failed to fetch recipient directory." });
        })
        .finally(() => setIsLoadingRecipients(false));
    }
  }, [isOpen, recipientType, recipientsList.length]);

  if (!isOpen) return null;

  // Filter recipients based on search query
  const filteredRecipients = recipientsList.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleCopyEnv = () => {
    const envText = `SMTP_HOST=smtp.gmail.com\nSMTP_PORT=587\nSMTP_USER=your_gmail_username@gmail.com\nSMTP_PASSWORD=your_gmail_app_password_here\nSMTP_SENDER=S-DESK Board <your_gmail_username@gmail.com>\nSMTP_USE_TLS=True`;
    navigator.clipboard.writeText(envText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setAlertMsg({ type: "error", text: "Please enter a subject line." });
      return;
    }
    if (!body.trim()) {
      setAlertMsg({ type: "error", text: "Please enter the email body content." });
      return;
    }
    if (recipientType === "custom" && selectedEmails.size === 0) {
      setAlertMsg({ type: "error", text: "Please select at least one recipient." });
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
        text: `Email successfully queued! Sent to ${res.data.recipient_count} recipient(s).`,
      });
      // Clear inputs on success
      setSubject("");
      setBody("");
      setSelectedEmails(new Set());
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to send email. Check SMTP setup.";
      setAlertMsg({ type: "error", text: errorMsg });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all animate-slide-up">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
              Messaging Space (Mail to Hive)
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">SMTP Status:</span>
              {isLoadingSmtp ? (
                <span className="flex items-center gap-1 text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                </span>
              ) : smtpStatus.configured ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Configured ({smtpStatus.smtp_user})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Not Configured (Guidelines in Tab)
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/60 px-4 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab("compose")}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "compose"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Mail className="w-4.5 h-4.5" />
            Compose Message
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "preview"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Eye className="w-4.5 h-4.5" />
            Live Email Preview
          </button>
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "guidelines"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            SMTP Setup Guidelines
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0 bg-slate-50/30 dark:bg-slate-950/10">
          
          {/* Action alerts */}
          {alertMsg.text && (
            <div className={`p-3.5 rounded-xl border mb-5 flex items-start gap-2.5 text-xs font-semibold ${
              alertMsg.type === "success" 
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-805 dark:text-emerald-400" 
                : "bg-rose-50 dark:bg-rose-950/20 border-rose-105/30 dark:border-rose-900/30 text-rose-650 dark:text-rose-450"
            }`}>
              {alertMsg.type === "success" ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-550 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{alertMsg.text}</span>
            </div>
          )}

          {/* COMPOSE TAB */}
          {activeTab === "compose" && (
            <form onSubmit={handleSend} className="space-y-5">
              
              {/* Recipient Selection Segment */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Recipient Group
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "all", label: "All Hive Users", desc: "Faculty + Students" },
                    { id: "faculty", label: "Faculty Only", desc: "All Professors" },
                    { id: "students", label: "Students Only", desc: "All Batches" },
                    { id: "custom", label: "Selected Persons", desc: "Custom checklists" }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRecipientType(opt.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        recipientType === opt.id
                          ? "border-indigo-650 bg-indigo-50/30 dark:bg-indigo-950/15 dark:border-indigo-500/80 shadow-sm"
                          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700"
                      }`}
                    >
                      <span className={`text-xs font-bold leading-none ${
                        recipientType === opt.id ? "text-indigo-650 dark:text-indigo-400" : "text-slate-800 dark:text-slate-200"
                      }`}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Recipients Checklist (Visible only when recipientType is 'custom') */}
              {recipientType === "custom" && (
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3.5 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">
                      Select Contacts ({selectedEmails.size} selected)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-750 transition-colors"
                      >
                        Select Filtered
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-750 transition-colors"
                      >
                        Clear Filtered
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users by name, role, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Contact scroll view */}
                  {isLoadingRecipients ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100/50 dark:divide-slate-800/30 pr-1 space-y-1">
                      {filteredRecipients.length > 0 ? (
                        filteredRecipients.map((rec) => (
                          <label
                            key={rec.id}
                            className="flex items-center gap-3.5 py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedEmails.has(rec.email)}
                              onChange={() => toggleSelectEmail(rec.email)}
                              className="rounded border-slate-200 dark:border-slate-750 text-indigo-600 focus:ring-indigo-550 w-4 h-4"
                            />
                            {rec.profile_picture ? (
                              <img
                                src={rec.profile_picture}
                                alt={rec.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-100 dark:border-slate-800"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/45 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-100/50 dark:border-indigo-900/30">
                                {rec.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {rec.name}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 truncate">
                                <span>{rec.email}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-650"></span>
                                <span className="uppercase text-[9px] font-extrabold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-500 dark:text-slate-400">
                                  {rec.role}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))
                      ) : (
                        <div className="text-center py-8 text-xs font-medium text-slate-400 dark:text-slate-500">
                          No matching contacts found in hive.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Subject Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Subject Line
                </label>
                <input
                  type="text"
                  placeholder="Enter email subject header..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-105 dark:border-slate-800/80 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              {/* Body Content Area */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex justify-between">
                  <span>Message Body</span>
                  <span className="normal-case text-[10px] text-slate-400 font-medium">HTML formatting is supported</span>
                </label>
                <textarea
                  rows={6}
                  placeholder="Type your official announcement or notice here... Use HTML tags like <b>bold</b>, <i>italic</i>, or <p>paragraphs</p> for custom styles."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-105 dark:border-slate-800/80 rounded-xl px-4 py-3.5 text-xs text-slate-905 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm font-sans resize-none"
                />
                <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium px-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Line breaks will be converted automatically to breaks (<code className="bg-slate-100 dark:bg-slate-850 px-1 py-0.2 rounded text-slate-600 dark:text-slate-400">&lt;br /&gt;</code>) in HTML.</span>
                </div>
              </div>
            </form>
          )}

          {/* LIVE PREVIEW TAB */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/35 dark:border-indigo-900/30 text-[11px] font-semibold text-indigo-755 dark:text-indigo-400 flex gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>This preview demonstrates how S-DESK template wraps your message before emailing. Make sure the typography and padding align with your standards.</span>
              </div>
              
              {/* Inbox Mockup Container */}
              <div className="border border-slate-205 dark:border-slate-800/70 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-xs">
                
                {/* Simulated Email Envelope Header */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border-b border-slate-100 dark:border-slate-800/50 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex gap-2">
                    <span className="font-bold w-12 text-right">Subject:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white truncate">
                      {subject || "(No Subject entered)"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold w-12 text-right">From:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      S-DESK Board &lt;{smtpStatus.smtp_user || "sender@system-mail.com"}&gt;
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold w-12 text-right">To:</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400 italic">
                      {recipientType === "all" && "All Hive Users (Faculty + Students)"}
                      {recipientType === "faculty" && "All Faculty Staff"}
                      {recipientType === "students" && "All Registered Students"}
                      {recipientType === "custom" && `Custom Selection (${selectedEmails.size} Emails)`}
                    </span>
                  </div>
                </div>

                {/* Simulated Email HTML Body */}
                <div className="p-6 bg-[#f8fafc] flex justify-center">
                  <div className="w-full max-w-lg bg-white border border-slate-100 rounded-xl shadow-xs overflow-hidden text-slate-800">
                    
                    {/* Newsletter header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-5 text-center">
                      <h3 className="m-0 text-base font-extrabold tracking-tight">S-DESK Department Announcement</h3>
                      <div className="inline-block px-2 py-0.5 bg-white/20 text-white rounded-full font-bold text-[9px] mt-1.5">
                        Sent by Administrator
                      </div>
                    </div>
                    
                    {/* Newsletter content */}
                    <div 
                      className="p-6 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans min-h-[120px]"
                      dangerouslySetInnerHTML={{
                        __html: body.trim() 
                          ? body.replace(/\n/g, "<br />")
                          : "<p style='color:#a0aec0;font-style:italic;'>Type some text in the compose tab to see a mockup preview here...</p>"
                      }}
                    />
                    
                    {/* Newsletter footer */}
                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
                      <p className="m-0">This message was sent to you from the S-DESK Academic Management Board.</p>
                      <p className="m-1 font-bold">Do not reply directly to this email.</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* GUIDELINES TAB */}
          {activeTab === "guidelines" && (
            <div className="space-y-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  SMTP Integration Guidelines
                </h3>
                <p>
                  S-DESK utilizes SMTP to communicate notices directly to emails. Ensure you configure credentials correctly in the environment configuration to run the service.
                </p>
              </div>

              {/* Step 1: Env Config */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-905 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/45 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black border border-indigo-100/50 dark:border-indigo-900/30">1</span>
                    Add Settings to Environment (.env)
                  </span>
                  <button
                    onClick={handleCopyEnv}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Open the consolidated <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-bold font-mono">.env</code> file in your root project folder and append/modify SMTP configurations:
                </p>
                <pre className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3 text-[10.5px] font-mono text-slate-700 dark:text-slate-350 overflow-x-auto select-all leading-normal whitespace-pre">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail_username@gmail.com
SMTP_PASSWORD=your_gmail_app_password_here
SMTP_SENDER=S-DESK Board <your_gmail_username@gmail.com>
SMTP_USE_TLS=True`}
                </pre>
              </div>

              {/* Step 2: Google App Password */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <span className="font-extrabold text-slate-905 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/45 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black border border-indigo-100/50 dark:border-indigo-900/30">2</span>
                  Configure Gmail App Passwords (Recommended)
                </span>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Modern email providers (like Gmail) reject direct account passwords for SMTP connection security. Create a dedicated **App Password**:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1.5 text-[11px] text-slate-550 dark:text-slate-400">
                  <li>Go to your **[Google Account dashboard](https://myaccount.google.com)**.</li>
                  <li>Navigate to the **Security** tab on the left sidebar.</li>
                  <li>Ensure **2-Step Verification** is enabled for your account.</li>
                  <li>Search or locate the **App Passwords** setting inside verification configurations.</li>
                  <li>Select **Mail** as the app, and enter a custom device name (e.g. *S-DESK App*).</li>
                  <li>Click **Generate**. Copy the highlighted **16-character password code** (e.g. `abcd efgh ijkl mnop`).</li>
                  <li>Paste this code as your <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-bold font-mono">SMTP_PASSWORD</code> (with no spaces) in your <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-bold font-mono">.env</code>.</li>
                </ol>
              </div>

              {/* Step 3: Server Reboot */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <span className="font-extrabold text-slate-905 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/45 text-indigo-650 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black border border-indigo-100/50 dark:border-indigo-900/30">3</span>
                  Restart the Application Server
                </span>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Flask environment files are read once at startup. After editing <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono font-bold">.env</code>, terminate your running backend development server and execute:
                </p>
                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5 font-mono text-[10.5px] text-slate-700 dark:text-slate-350">
                  python run.py
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer (Controls) */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-250 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-205 dark:hover:border-slate-700 rounded-xl transition-all"
            disabled={isSending}
          >
            Cancel
          </button>
          
          {activeTab === "compose" && (
            <button
              onClick={handleSend}
              className="px-4.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSending || !smtpStatus.configured}
              title={!smtpStatus.configured ? "Please configure SMTP inside .env first" : ""}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending Announcement...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" /> Send Announcement
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
