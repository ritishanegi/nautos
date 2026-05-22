"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, ChevronLeft, Loader2 } from "lucide-react";
import { OCR_STATUS_STYLE } from "@/lib/constants";

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

  const fetchDocument = useCallback(async () => {
    const res = await fetch(`/api/documents/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDoc(data.document);
      setJob(data.job);
      setDownloadUrl(data.downloadUrl);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Poll job status while processing
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
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Document not found
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm mb-6">
        <Link href="/dashboard/documents" className="text-muted-foreground hover:text-foreground flex items-center gap-0.5">
          <ChevronLeft className="size-4" />Documents
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground truncate">{doc.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{doc.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{doc.docType.replace(/_/g, " ")}</p>
        </div>
        {downloadUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="size-4 mr-1.5" />Download
            </a>
          </Button>
        )}
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Status", value: doc.ocrStatus },
          { label: "Pages", value: doc.pageCount?.toString() ?? "—" },
          { label: "Scope", value: doc.scope },
          { label: "Uploaded", value: new Date(doc.createdAt).toLocaleDateString() },
        ].map((item) => (
          <div key={item.label} className="border border-border rounded-md p-3">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium text-foreground mt-0.5 capitalize">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Processing status */}
      {job && (
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Processing</p>
            <Badge variant="outline" className={`text-[11px] capitalize ${OCR_STATUS_STYLE[job.status] || ""}`}>
              {job.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={job.progress} className="flex-1 h-1.5" />
            <span className="text-xs text-muted-foreground tabular-nums">{job.progress}%</span>
          </div>
          {job.error && <p className="mt-2 text-sm text-destructive">{job.error}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {job.processedPages} / {job.totalPages ?? "?"} pages
          </p>
        </div>
      )}
    </div>
  );
}
