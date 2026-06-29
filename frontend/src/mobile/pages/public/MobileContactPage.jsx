import { useState } from "react";
import { Mail, Phone, Clock, MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
import MobileCard from "../../components/MobileCard";

const INFO_CARDS = [
  { icon: Mail, title: "Email Us", value: "cs@university.edu", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { icon: Phone, title: "Call Us", value: "+91 123 456 7890", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { icon: Clock, title: "Office Hours", value: "Mon-Fri, 9AM-5PM", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { icon: MessageSquare, title: "Response Time", value: "Within 24 hours", color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
];

const FAQS = [
  { q: "How do I get access to Hive?", a: "Contact your department's HOD or system administrator to get your account set up. Students use their college email, and faculty are invited via a registration link." },
  { q: "Can I access Hive on mobile?", a: "Yes! Hive is fully optimized for mobile devices. You're using it right now!" },
  { q: "Who can create projects?", a: "The Head of Department (HOD) can create and assign projects. Faculty can manage their assigned projects, and students can collaborate within their teams." },
  { q: "How do notifications work?", a: "You'll receive real-time notifications for project updates, new forum posts, and important announcements. You can manage notification preferences in Settings." },
];

export default function MobileContactPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", type: "general", message: "" });

  return (
    <div className="mobile-fade-in px-5 py-6 space-y-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Contact Us</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Have a question or need help? We're here for you.
        </p>
      </div>

      {/* Info cards — single column */}
      <div className="space-y-2">
        {INFO_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <MobileCard key={card.title}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.title}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{card.value}</p>
                </div>
              </div>
            </MobileCard>
          );
        })}
      </div>

      {/* Inquiry form */}
      <MobileCard>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Send an Inquiry</h2>
        <div className="space-y-3">
          <input type="text" placeholder="Your Name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25" />
          <input type="email" placeholder="Your Email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            className="w-full px-3 py-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25" />
          <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
            className="w-full px-3 py-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/25">
            <option value="general">General Inquiry</option>
            <option value="technical">Technical Support</option>
            <option value="feedback">Feedback</option>
            <option value="other">Other</option>
          </select>
          <textarea placeholder="Your Message" rows={4} value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
            className="w-full px-3 py-3 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 resize-none" />
          <button className="mobile-tappable w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Send Message
          </button>
        </div>
      </MobileCard>

      {/* FAQ */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-3 px-1">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <MobileCard key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)} className="cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1">{faq.q}</p>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
              </div>
              {openFaq === i && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">{faq.a}</p>
              )}
            </MobileCard>
          ))}
        </div>
      </div>
    </div>
  );
}
