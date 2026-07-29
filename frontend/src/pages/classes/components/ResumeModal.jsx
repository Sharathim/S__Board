import { useRef } from "react";
import { Modal } from "../../../components/ui/Modal";
import { useQuery } from "@tanstack/react-query";
import { getResumeData } from "../../../api/classes";
import { Spinner } from "../../../components/ui/Spinner";
import { Printer, X, Award, FolderKanban, User, Mail, Phone, MapPin, GraduationCap } from "lucide-react";

export function ResumeModal({ open, onClose, studentId, studentName }) {
  const resumeRef = useRef();

  const { data: resumePayload, isLoading, isError } = useQuery({
    queryKey: ["resume-data", studentId],
    queryFn: async () => {
      const res = await getResumeData(studentId);
      return res.data;
    },
    enabled: !!open && !!studentId
  });

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  const profile = resumePayload?.profile || {};
  const accomplishments = resumePayload?.accomplishments || [];
  const projects = resumePayload?.projects || [];

  return (
    <Modal open={open} onClose={onClose} title={`Resume Preview — ${studentName || profile.name || "Student"}`} size="lg">
      <div className="space-y-4 text-xs pt-1">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-slate-600 dark:text-slate-400 font-semibold">
            Auto-assembled resume from database profile, extracurriculars, and projects.
          </p>
          <button
            onClick={handlePrint}
            disabled={isLoading || isError}
            className="mobile-tappable px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="py-12 flex justify-center items-center">
            <Spinner />
          </div>
        )}

        {isError && (
          <div className="py-8 text-center text-red-500 font-semibold">
            Failed to load student resume data.
          </div>
        )}

        {/* Printable Resume Document */}
        {!isLoading && !isError && (
          <div
            ref={resumeRef}
            className="p-8 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-sm space-y-6 printable-area"
          >
            {/* Header / Personal Details */}
            <div className="border-b border-slate-200 pb-5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {profile.name || studentName}
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                Reg No: {profile.register_number || "N/A"} | Roll No: {profile.roll_number || "N/A"} | Class: {profile.class_name}
              </p>

              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 mt-3">
                {profile.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-primary-600" />
                    {profile.email}
                  </span>
                )}
                {profile.mobile_number && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-primary-600" />
                    {profile.mobile_number}
                  </span>
                )}
                {profile.communication_address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary-600" />
                    {profile.communication_address}
                  </span>
                )}
              </div>
            </div>

            {/* Extracurricular Accomplishments Section */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-primary-600 border-b border-primary-200 pb-1.5 mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Extracurricular Accomplishments & Honors ({accomplishments.length})
              </h3>

              {accomplishments.length === 0 ? (
                <p className="text-slate-400 italic text-xs py-2">No extracurricular accomplishments logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {accomplishments.map((acc) => (
                    <div key={acc.id} className="text-xs space-y-1">
                      <div className="flex justify-between items-baseline font-bold text-slate-900">
                        <span>
                          {acc.title} {acc.position_achieved ? `— (${acc.position_achieved})` : ""}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {acc.event_date ? new Date(acc.event_date).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <div className="text-slate-500 font-semibold text-[11px]">
                        Organizer: {acc.organizer || "N/A"} | Category: {acc.category}
                      </div>
                      {acc.description && (
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {acc.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Academic Projects Section */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-primary-600 border-b border-primary-200 pb-1.5 mb-3 flex items-center gap-1.5">
                <FolderKanban className="w-4 h-4" />
                Academic Projects ({projects.length})
              </h3>

              {projects.length === 0 ? (
                <p className="text-slate-400 italic text-xs py-2">No academic project memberships recorded.</p>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => (
                    <div key={proj.id} className="text-xs space-y-0.5">
                      <div className="flex justify-between items-baseline font-bold text-slate-900">
                        <span>{proj.name}</span>
                        <span className="text-[10px] uppercase font-extrabold text-slate-500">
                          {proj.status}
                        </span>
                      </div>
                      {proj.description && (
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {proj.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
