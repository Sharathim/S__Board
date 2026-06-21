import { useState, useRef } from "react";
import { Upload, X, File, Image, Video } from "lucide-react";
import clsx from "clsx";

const MAX_SIZE = 50 * 1024 * 1024;

export function FileUpload({ onFileSelect, accept = "image/*,.pdf,.doc,.docx", multiple = false }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (selectedFiles) => {
    const valid = [];
    for (const f of selectedFiles) {
      if (f.size > MAX_SIZE) {
        window.dispatchEvent(new CustomEvent("api-error", { detail: `${f.name} exceeds 50MB limit` }));
        continue;
      }
      valid.push(f);
    }
    setFiles(prev => multiple ? [...prev, ...valid] : valid);
    onFileSelect?.(multiple ? valid : valid[0]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith("image/")) return <Image className="w-5 h-5 text-green-500" />;
    if (file.type.startsWith("video/")) return <Video className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div>
      <div
        className={clsx(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-1">Max 50MB per file</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {getFileIcon(file)}
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
              <button onClick={() => removeFile(index)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
