"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface DocumentDetail {
  id: string;
  title: string;
  docType: string;
  scope: string;
  ocrStatus: string;
  pageCount: number | null;
  manufacturer: string | null;
  modelType: string | null;
  createdAt: string;
}

interface Job {
  id: string;
  status: string;
  progress: number;
  totalPages: number | null;
  processedPages: number;
  error: string | null;
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDoc(data.document);
        setJob(data.job);
        setDownloadUrl(data.downloadUrl);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!job || job.status === "complete" || job.status === "failed") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/documents/${id}/status`);
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
        if (data.job.status === "complete" || data.job.status === "failed") {
          clearInterval(interval);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [id, job?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-red-400">Document not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard/documents" className="text-slate-400 hover:text-white">
          &larr; Documents
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-white font-medium">{doc.title}</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{doc.title}</h1>
              <p className="text-slate-400 mt-1">{doc.docType.replace(/_/g, " ")}</p>
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
              >
                Download PDF
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <InfoCard label="Status" value={doc.ocrStatus} />
            <InfoCard label="Pages" value={doc.pageCount?.toString() ?? "Unknown"} />
            <InfoCard label="Scope" value={doc.scope} />
            <InfoCard label="Uploaded" value={new Date(doc.createdAt).toLocaleDateString()} />
          </div>
        </div>

        {job && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Processing Status</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="text-sm text-slate-400">{job.progress}%</span>
            </div>
            {job.error && (
              <p className="text-red-400 text-sm mt-3">{job.error}</p>
            )}
            <p className="text-slate-500 text-xs mt-2">
              {job.processedPages} / {job.totalPages ?? "?"} pages processed
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-white mt-1 capitalize">{value}</p>
    </div>
  );
}
