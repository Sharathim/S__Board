import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail, Phone, Clock, Send, ChevronRight,
  Sparkles, CheckCircle2, Shield, AlertCircle,
  ChevronDown, MessageSquare, HelpCircle, Users, BookOpen
} from "lucide-react";

// ─── FAQ Data ────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How do I register as a student on DPMS?",
    a: "After your HOD approves your institution email, sign in using your Google account via the Student login on the Home page. Registration is automatic on first login.",
  },
  {
    q: "Can faculty members add their own projects?",
    a: "Yes. Once onboarded by the HOD, faculty coordinators can create, manage, and assign projects to student batches from their dashboard.",
  },
  {
    q: "What happens after I submit this contact form?",
    a: "Your inquiry is logged and forwarded to the department admin desk. You'll receive an email acknowledgement within 1–2 working days.",
  },
  {
    q: "How do I report a technical issue with the portal?",
    a: "Use the form on this page with the subject 'Technical Issue'. Alternatively, email support.dpms@sharathi-board.edu.in directly for urgent matters.",
  },
  {
    q: "Is there a mobile app for DPMS?",
    a: "DPMS is fully responsive and works on all devices via the browser. A dedicated mobile app is planned for a future release.",
  },
];

// ─── Quick Contact Cards ──────────────────────────────────────────────────────
const CONTACT_CARDS = [
  {
    icon: Mail,
    label: "Email Us",
    value: "hod.cs@sharathi-board.edu.in",
    sub: "support.dpms@sharathi-board.edu.in",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    href: "mailto:hod.cs@sharathi-board.edu.in",
  },
  {
    icon: Phone,
    label: "Call Us",
    value: "+91 80 2554 9820",
    sub: "HOD Desk  •  Mon – Fri",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    href: "tel:+918025549820",
  },
  {
    icon: Clock,
    label: "Office Hours",
    value: "9:30 AM – 4:30 PM",
    sub: "HOD slot: Tue & Thu 2–4 PM",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    href: null,
  },
  {
    icon: MessageSquare,
    label: "Response Time",
    value: "Within 24–48 hrs",
    sub: "All submitted inquiries",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    href: null,
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl transition-all duration-200 overflow-hidden ${open ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-white"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className={`text-sm font-semibold leading-snug transition-colors ${open ? "text-indigo-700" : "text-slate-800"}`}>
          {q}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-indigo-500" : "text-slate-400"}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed border-t border-indigo-100/60 pt-3 animate-fade-in">
          {a}
        </div>
      )}
    </div>
  );
}

export default function ContactPage() {
  // Form state
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [role,      setRole]      = useState("student");
  const [subject,   setSubject]   = useState("");
  const [message,   setMessage]   = useState("");
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1600);
  };

  const handleReset = () => {
    setSubmitted(false);
    setName(""); setEmail(""); setSubject(""); setMessage(""); setRole("student");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pt-[72px] selection:bg-indigo-500 selection:text-white">

      {/* ── Ambient backgrounds ── */}
      <div className="absolute top-0 inset-x-0 h-[480px] bg-gradient-to-b from-indigo-50/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-16 right-0 w-[350px] h-[350px] bg-indigo-100/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-40 left-0 w-[300px] h-[300px] bg-violet-100/20 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Hero header ── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4 text-center">
        <nav className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4">
          <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600 font-semibold">Contact</span>
        </nav>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 shadow-sm mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-bold text-indigo-700 tracking-widest uppercase">Inquiries &amp; Support</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
          Connect with{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Our Department
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
          Have questions about projects, faculty invites, or portal access? We're here to help — reach out anytime.
        </p>
      </section>

      {/* ── Quick contact cards ── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTACT_CARDS.map(({ icon: Icon, label, value, sub, color, bg, border, href }) => {
            const content = (
              <div className={`group rounded-2xl border ${border} ${bg} p-5 flex items-start gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default`}>
                <div className={`w-10 h-10 rounded-xl bg-white border ${border} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                  <div className={`text-sm font-bold ${color} leading-tight truncate`}>{value}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{sub}</div>
                </div>
              </div>
            );
            return href ? (
              <a key={label} href={href} className="block no-underline">{content}</a>
            ) : (
              <div key={label}>{content}</div>
            );
          })}
        </div>
      </section>

      {/* ── Main: Form + FAQ ── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">

          {/* ──────── LEFT: Contact Form ──────── */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">

              {/* Card header strip */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-bold text-lg">Send an Inquiry</h2>
                    <p className="text-indigo-200 text-xs mt-0.5">Our team typically responds within 24–48 hours</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              <div className="p-7">
                {/* ── Success state ── */}
                {submitted ? (
                  <div className="py-10 text-center space-y-4 animate-fade-in">
                    <div className="relative mx-auto w-20 h-20">
                      <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-40" />
                      <div className="relative w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Message Sent!</h3>
                      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                        Thank you, <span className="font-semibold text-slate-700">{name || "there"}</span>! Your inquiry has been received. We'll get back to you at <span className="font-semibold text-indigo-600">{email}</span> within 24–48 hours.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={handleReset}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send Another
                      </button>
                      <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
                      >
                        Back to Home
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* ── Form ── */
                  <form onSubmit={handleSubmit} className="space-y-5 text-xs">

                    {errorMsg && (
                      <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl animate-fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="font-semibold text-sm">{errorMsg}</span>
                      </div>
                    )}

                    {/* Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Arjun Sharma"
                            className="w-full py-3 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 placeholder-slate-300 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@gmail.com"
                          className="w-full py-3 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 placeholder-slate-300 transition-all"
                        />
                      </div>
                    </div>

                    {/* Role & Subject */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Your Role
                        </label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full py-3 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 text-slate-600 cursor-pointer transition-all appearance-none"
                        >
                          <option value="student">UG / PG Student</option>
                          <option value="parent">Parent / Guardian</option>
                          <option value="recruiter">Industry Partner / Recruiter</option>
                          <option value="faculty">Faculty / Researcher</option>
                          <option value="other">General Visitor</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Subject <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g. Project Registration Query"
                          className="w-full py-3 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 placeholder-slate-300 transition-all"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Message <span className="text-rose-500">*</span>
                        </label>
                        <span className={`text-[10px] font-semibold ${message.length > 450 ? "text-rose-500" : "text-slate-400"}`}>
                          {message.length}/500
                        </span>
                      </div>
                      <textarea
                        required
                        maxLength={500}
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your query in detail..."
                        className="w-full py-3 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 placeholder-slate-300 resize-none leading-relaxed transition-all"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl text-sm
                        hover:from-indigo-700 hover:to-violet-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200
                        active:translate-y-0 transition-all duration-200
                        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending…</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>

                    <p className="text-center text-[10px] text-slate-400 leading-normal">
                      By submitting, you allow DPMS to use your contact details for this inquiry only. We never share your data.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* ──────── RIGHT: FAQ + Support links ──────── */}
          <div className="lg:col-span-5 space-y-6">

            {/* FAQ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Frequently Asked Questions</h3>
                  <p className="text-[10px] text-slate-400">Quick answers to common queries</p>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {FAQS.map((faq) => (
                  <FaqItem key={faq.q} {...faq} />
                ))}
              </div>
            </div>

            {/* Useful links */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                Quick Links
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Student Portal Login",        href: "/",        icon: BookOpen,      color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Features & Capabilities",     href: "/features",icon: Sparkles,      color: "text-violet-600", bg: "bg-violet-50" },
                  { label: "About the Department",        href: "/about",   icon: Users,         color: "text-blue-600",   bg: "bg-blue-50"   },
                  { label: "Email: support@sharathi-board",href: "mailto:support.dpms@sharathi-board.edu.in", icon: Mail, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map(({ label, href, icon: Icon, color, bg }) => (
                  href.startsWith("mailto") ? (
                    <a
                      key={label}
                      href={href}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all duration-150 group"
                    >
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">{label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 ml-auto shrink-0" />
                    </a>
                  ) : (
                    <Link
                      key={label}
                      to={href}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all duration-150 group"
                    >
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">{label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 ml-auto shrink-0" />
                    </Link>
                  )
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 bg-white text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} DPMS — Department Project Management System. All rights reserved.</p>
          <p className="tracking-wide">Built for excellence in computer science education.</p>
        </div>
      </footer>

    </div>
  );
}
