import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Mail, Phone, MapPin, Clock, Send, ChevronRight, 
  Sparkles, CheckCircle2, Shield, Info, Navigation, 
  ZoomIn, ZoomOut, AlertCircle, Building2, Cpu
} from "lucide-react";

export default function ContactPage() {
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student"); // student, parent, recruiter, other
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Map simulator states
  const [zoomLevel, setZoomLevel] = useState(1); // 1 to 2.5
  const [selectedMarker, setSelectedMarker] = useState("main"); // main, labs, hod

  const markers = {
    main: { name: "Main Campus Block", room: "A-Floor 2, Room 204", phone: "+91 80 2554 9821" },
    labs: { name: "CSE Lab Annex (Computing Center)", room: "Lab Block B, Ground Floor", phone: "+91 80 2554 9823" },
    hod: { name: "Department HOD Office", room: "Administrative Wing, Room 101", phone: "+91 80 2554 9820" },
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    
    setErrorMsg("");
    setSubmitting(true);

    // Simulate API request
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      // Reset form
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setRole("student");
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pt-[72px] relative selection:bg-indigo-500 selection:text-white">
      
      {/* Ambient backgrounds */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-indigo-50/40 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-20 right-10 w-[300px] h-[300px] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[350px] h-[350px] bg-violet-200/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Header */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 text-center">
        <nav className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-5">
          <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600 font-semibold">Contact</span>
        </nav>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 shadow-sm mb-5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-bold text-indigo-750 tracking-wider uppercase">Inquiries &amp; Consultations</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Connect with{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            Our Department
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          Have questions about student projects, faculty coordinator invites, or admissions? Drop us a message below or visit our office.
        </p>
      </section>

      {/* Main Content Form + Map */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
          
          {/* Left Column: Interactive Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Send an Inquiry</h2>
                  <p className="text-xs text-slate-400">Direct query dispatch to HOD admin desk</p>
                </div>
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>

              {submitted ? (
                <div className="py-12 px-4 text-center animate-fade-in space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-500 shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Message Dispatched!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Thank you. Your message has been successfully logged. An email copy has been dispatched, and our administrative coordinator will review it shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-xs font-semibold px-5 py-2.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                  {errorMsg && (
                    <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-start gap-2 animate-fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-semibold">{errorMsg}</span>
                    </div>
                  )}

                  {/* Name & Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 uppercase tracking-wide">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 uppercase tracking-wide">Gmail Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@gmail.com"
                        className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Role and Subject row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 uppercase tracking-wide">Your Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full py-2.5 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 text-slate-650 cursor-pointer"
                      >
                        <option value="student">UG/PG Student</option>
                        <option value="parent">Parent / Guardian</option>
                        <option value="recruiter">Industry Partner / Recruiter</option>
                        <option value="other">General Visitor</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 uppercase tracking-wide">Subject *</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Project Registration Query"
                        className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Message Field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <label className="font-bold text-slate-500 uppercase tracking-wide">Message *</label>
                      <span className="text-[10px] text-slate-400 font-semibold">{message.length}/500 chars</span>
                    </div>
                    <textarea
                      required
                      maxLength={500}
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your consultation details here..."
                      className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:translate-y-0 hover:-translate-y-0.5 transition-all shadow-lg shadow-indigo-100 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-normal">
                By submitting this form, you authorize DPMS portals to log your name and email for consultation response followups. We never share visitor queries.
              </p>
            </div>
          </div>

          {/* Right Column: Address details and simulated map */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            
            {/* Coordinates detail card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-indigo-500 animate-pulse" />
                Office Coordinates
              </h3>

              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Campus Address</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      CS Department, Level 2, Shastri Bhavan Building Annex, Campus North, Bangalore, 560012
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Inquiry Lines</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">HOD desk: +91 80 2554 9820</p>
                    <p className="text-[11px] text-slate-500">Secretary: +91 80 2554 9821</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Department Email</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">hod.cs@sharathi-board.edu.in</p>
                    <p className="text-[11px] text-slate-500">support.dpms@sharathi-board.edu.in</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated interactive map mockup */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex-1 min-h-[300px] flex flex-col justify-between">
              
              {/* Map view area */}
              <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden p-6">
                
                {/* Simulated Grid Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-25" />

                {/* Simulated Campus Layout SVG */}
                <div 
                  className="relative transition-transform duration-300 ease-out w-full h-full max-h-[180px] max-w-[260px] flex items-center justify-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* Outer Campus Boundary */}
                  <div className="absolute inset-0 border-2 border-dashed border-indigo-500/20 rounded-xl bg-indigo-550/5 flex items-center justify-center">
                    
                    {/* Simulated Buildings grid */}
                    <div className="grid grid-cols-3 gap-6 p-4 w-full h-full">
                      {/* Main Block */}
                      <button
                        onClick={() => setSelectedMarker("main")}
                        className={`relative rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          selectedMarker === "main"
                            ? "bg-indigo-650/40 border-indigo-500 shadow-indigo-500/10 shadow-lg text-white"
                            : "bg-slate-850/60 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                        <span className="text-[8px] font-bold">Main Block</span>
                        {selectedMarker === "main" && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                        )}
                      </button>

                      {/* Labs Annex */}
                      <button
                        onClick={() => setSelectedMarker("labs")}
                        className={`relative rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          selectedMarker === "labs"
                            ? "bg-violet-650/40 border-violet-500 shadow-violet-500/10 shadow-lg text-white"
                            : "bg-slate-850/60 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        <Cpu className="w-5 h-5" />
                        <span className="text-[8px] font-bold">Lab Annex</span>
                        {selectedMarker === "labs" && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-violet-500 animate-ping" />
                        )}
                      </button>

                      {/* Admin Wing */}
                      <button
                        onClick={() => setSelectedMarker("hod")}
                        className={`relative rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          selectedMarker === "hod"
                            ? "bg-amber-650/40 border-amber-500 shadow-amber-500/10 shadow-lg text-white"
                            : "bg-slate-850/60 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        <Shield className="w-5 h-5" />
                        <span className="text-[8px] font-bold">Admin/HOD</span>
                        {selectedMarker === "hod" && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                        )}
                      </button>
                    </div>

                  </div>
                </div>

                {/* Map Control overlay (zoom buttons) */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.25))}
                    className="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(z => Math.max(1, z - 0.25))}
                    className="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Map Description bar */}
              <div className="bg-slate-900 border-t border-slate-800 p-4 text-[10px] text-slate-400">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white uppercase tracking-wider text-[9px]">Map Info:</span>
                  <span className="text-indigo-400 font-semibold">{zoomLevel.toFixed(2)}x zoom</span>
                </div>
                <div className="font-bold text-slate-200 text-xs">{markers[selectedMarker].name}</div>
                <div className="mt-0.5">Location: **{markers[selectedMarker].room}**</div>
                <div className="mt-0.5">Tel: **{markers[selectedMarker].phone}**</div>
              </div>

            </div>

            {/* Office consult hours strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                Consultation Hours
              </h3>
              
              <div className="space-y-2 text-[11px] text-slate-500">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">Monday — Friday:</span>
                  <span>9:30 AM — 4:30 PM</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">HOD Consultations:</span>
                  <span className="text-indigo-600 font-bold">Tues &amp; Thurs (2 PM - 4 PM)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-semibold text-slate-700">Weekends:</span>
                  <span className="text-slate-400">Office Closed (Online Only)</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 bg-white text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>
            &copy; {new Date().getFullYear()} DPMS — Department Project Management System. All rights reserved.
          </p>
          <p className="tracking-wide">Built for excellence in computer science education.</p>
        </div>
      </footer>

    </div>
  );
}
