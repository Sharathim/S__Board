import { useState, useEffect } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Award, Calendar, Building, FileText, UploadCloud, CheckCircle, AlertCircle } from "lucide-react";

const CATEGORIES = [
  { id: "HACKATHON", label: "Hackathon" },
  { id: "COURSE_CERTIFICATION", label: "Course / Certification" },
  { id: "WORKSHOP", label: "Workshop / Seminar" },
  { id: "SPORTS", label: "Sports & Athletics" },
  { id: "PAPER_PRESENTATION", label: "Paper / Project Presentation" },
  { id: "VOLUNTEERING", label: "Volunteering / Club Activity" },
  { id: "OTHER", label: "Other Achievement" },
];

export function AddAccomplishmentModal({ open, onClose, onSubmit, isPending, initialData = null }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("HACKATHON");
  const [organizer, setOrganizer] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [positionAchieved, setPositionAchieved] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setCategory(initialData.category || "HACKATHON");
      setOrganizer(initialData.organizer || "");
      setEventDate(initialData.event_date ? initialData.event_date.split("T")[0] : "");
      setPositionAchieved(initialData.position_achieved || "");
      setDescription(initialData.description || "");
      setSelectedFile(null);
    } else {
      setTitle("");
      setCategory("HACKATHON");
      setOrganizer("");
      setEventDate("");
      setPositionAchieved("");
      setDescription("");
      setSelectedFile(null);
    }
    setErrorMsg("");
  }, [initialData, open]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      setErrorMsg("Certificate file size must be less than 10MB");
      setSelectedFile(null);
    } else {
      setErrorMsg("");
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      setErrorMsg("Please fill in all required fields (Title, Event Date)");
      return;
    }

    const payload = {
      title,
      category,
      organizer,
      event_date: eventDate,
      position_achieved: positionAchieved,
      description,
      file: selectedFile,
    };

    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={initialData ? "Edit Accomplishment" : "Add Accomplishment / Achievement"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Title / Achievement Name *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 1st Place in Maze Hack 2026"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        {/* Category & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Event Date *
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        {/* Organizer & Position */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Organizer / Institution / Platform
            </label>
            <input
              type="text"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="e.g. DGVC, Arumbakkam / Udemy"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Position / Rank / Grade
            </label>
            <input
              type="text"
              value={positionAchieved}
              onChange={(e) => setPositionAchieved(e.target.value)}
              placeholder="e.g. 1st Place / Certified / Distinction"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Description & Highlights
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your achievement, hackathon topic, or course skills learned..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
          />
        </div>

        {/* Certificate Upload */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Certificate / Proof Document (Optional)
          </label>
          <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 hover:bg-slate-100/50 cursor-pointer relative transition-colors">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-6 h-6 text-primary-500 mb-1" />
            <p className="font-bold text-gray-700 dark:text-gray-300">
              {selectedFile ? selectedFile.name : "Click or drop certificate PDF/Image"}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">Maximum size 10MB</p>
          </div>
          {initialData?.certificate_url && !selectedFile && (
            <div className="text-[10px] text-primary-600 font-semibold mt-1">
              Existing Certificate attached. Uploading a new file will replace it.
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
          >
            {isPending ? "Saving..." : initialData ? "Update Accomplishment" : "Add Accomplishment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
