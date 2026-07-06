import React, { useState, useEffect } from "react";
import { X, Mail, Search, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getSmtpStatus, getRecipients, sendMail } from "../../api/mail";

export default function MailComposerModal({ isOpen, onClose }) {
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
  const [alertMsg, setAlertMsg] = useState({ type: "", text: "" }); // 'success' or 'error'

  // Load SMTP status and recipient list when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubject("");
      setBody("");
      setRecipientType("all");
      setSelectedEmails(new Set());
      setAlertMsg({ type: "", text: "" });
      
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
          setAlertMsg({ type: "error", text: "Failed to fetch contacts." });
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setAlertMsg({ type: "error", text: "Please enter a subject line." });
      return;
    }
    if (!body.trim()) {
      setAlertMsg({ type: "error", text: "Please enter message body content." });
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
        text: `Message sent to ${res.data.recipient_count} recipient(s).`,
      });
      setSubject("");
      setBody("");
      setSelectedEmails(new Set());
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to send message. Verify server connection.";
      setAlertMsg({ type: "error", text: errorMsg });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg flex flex-col max-h-[85vh] overflow-hidden transform transition-all animate-slide-up">
        
        {/* Modal Window Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            New Announcement
          </span>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email Headers Form */}
        <div className="px-6 flex-1 flex flex-col overflow-y-auto min-h-0 bg-white dark:bg-slate-900">
          
          {/* Action Alerts */}
          {alertMsg.text && (
            <div className={`p-3 rounded-lg border my-3.5 flex items-start gap-2 text-xs font-semibold ${
              alertMsg.type === "success" 
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400" 
                : "bg-rose-50 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-450"
            }`}>
              {alertMsg.type === "success" ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{alertMsg.text}</span>
            </div>
          )}

          {/* From field */}
          <div className="flex items-center gap-2 py-2.5 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">From:</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {smtpStatus.smtp_user ? `HIVE Board <${smtpStatus.smtp_user}>` : "HIVE Board Administrator"}
            </span>
          </div>

          {/* To field */}
          <div className="flex items-center gap-2 py-2.5 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">To:</span>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer flex-1 py-0.5"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All Hive Users (Faculty & Students)</option>
              <option value="faculty" className="bg-white dark:bg-slate-900">Faculty Only</option>
              <option value="students" className="bg-white dark:bg-slate-900">Students Only</option>
              <option value="custom" className="bg-white dark:bg-slate-900">Selected Individuals...</option>
            </select>
          </div>

          {/* Custom Recipients Selector (Checklist layout) */}
          {recipientType === "custom" && (
            <div className="py-3 border-b border-slate-100 dark:border-slate-800/60 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-indigo-650 dark:text-indigo-400">
                  Selected Contacts ({selectedEmails.size})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    Select All
                  </button>
                  <span className="text-slate-200 dark:text-slate-800">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter users by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-slate-300 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              {isLoadingRecipients ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100/50 dark:divide-slate-800/20 pr-1 space-y-0.5">
                  {filteredRecipients.length > 0 ? (
                    filteredRecipients.map((rec) => (
                      <label
                        key={rec.id}
                        className="flex items-center gap-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(rec.email)}
                          onChange={() => toggleSelectEmail(rec.email)}
                          className="rounded border-slate-200 dark:border-slate-750 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {rec.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex-1">
                          ({rec.email})
                        </span>
                        <span className="uppercase text-[8px] font-black text-slate-450 dark:text-slate-500 border border-slate-100 dark:border-slate-800 px-1.5 py-0.2 rounded shrink-0">
                          {rec.role}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs font-semibold text-slate-400">
                      No contacts match search query
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subject field */}
          <div className="flex items-center gap-2 py-2.5 border-b border-slate-100 dark:border-slate-800/60">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">Subject:</span>
            <input
              type="text"
              placeholder="Enter announcement subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none flex-1 placeholder-slate-400"
            />
          </div>

          {/* Body Content Area */}
          <div className="flex-1 flex flex-col py-3.5 min-h-[220px]">
            <textarea
              placeholder="Write your announcement message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none resize-none font-sans leading-relaxed"
            />
          </div>
        </div>

        {/* Modal Window Control Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSend}
              disabled={isSending || !smtpStatus.configured}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" /> Send
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 transition-colors"
              disabled={isSending}
            >
              Cancel
            </button>
          </div>
          
          <div className="text-xs">
            {smtpStatus.configured ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> SMTP Connected
              </span>
            ) : (
              <span className="text-[10px] text-rose-500 dark:text-rose-450 font-bold flex items-center gap-1" title="Please configure SMTP keys in server environment variables">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> SMTP Config Required
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
