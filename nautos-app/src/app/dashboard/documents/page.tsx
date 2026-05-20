"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Document {
  id: string;
  title: string;
  docType: string;
  scope: string;
  ocrStatus: string;
  pageCount: number | null;
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleUpload(file: File, title: string, docType: string) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("docType", docType);
    formData.append("scope", "vessel");

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setShowUpload(false);
      fetchDocuments();
    }
    setUploading(false);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">Documents</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Upload Document
        </button>
      </div>

      <div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-slate-400 mb-4">No documents uploaded yet</p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Title</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Pages</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="text-white hover:text-cyan-400 transition-colors"
                      >
                        {doc.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{doc.docType}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.ocrStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {doc.pageCount ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
          uploading={uploading}
          dragOver={dragOver}
          setDragOver={setDragOver}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400",
    processing: "bg-blue-500/10 text-blue-400",
    complete: "bg-green-500/10 text-green-400",
    failed: "bg-red-500/10 text-red-400",
  };

  return (
    <span className={`text-xs px-2 py-1 rounded ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function UploadModal({
  onClose,
  onUpload,
  uploading,
  dragOver,
  setDragOver,
}: {
  onClose: () => void;
  onUpload: (file: File, title: string, docType: string) => void;
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("maintenance_manual");

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.toLowerCase().endsWith(".pdf")) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.pdf$/i, ""));
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.pdf$/i, ""));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Upload Document</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            &times;
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
            dragOver
              ? "border-cyan-500 bg-cyan-500/5"
              : file
                ? "border-green-500/50 bg-green-500/5"
                : "border-slate-700 hover:border-slate-600"
          }`}
        >
          {file ? (
            <p className="text-green-400 text-sm">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
          ) : (
            <>
              <p className="text-slate-400 mb-2">Drag & drop a PDF here, or</p>
              <label className="cursor-pointer text-cyan-400 hover:text-cyan-300 text-sm">
                browse files
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Document Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. MAN B&W Engine Maintenance Manual"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="maintenance_manual">Maintenance Manual</option>
              <option value="spare_parts_catalog">Spare Parts Catalog</option>
              <option value="safety_certificate">Safety Certificate</option>
              <option value="inspection_report">Inspection Report</option>
              <option value="drawing">Technical Drawing</option>
              <option value="sds">Safety Data Sheet</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => file && title && onUpload(file, title, docType)}
            disabled={!file || !title || uploading}
            className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
