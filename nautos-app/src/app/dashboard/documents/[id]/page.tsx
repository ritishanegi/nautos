"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  ChevronLeft,
  Clock,
  Layers,
  Scan,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

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

const STATUS_ICON = {
  pending: Clock,
  processing: Loader2,
  complete: CheckCircle2,
  failed: AlertCircle,
};

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
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-muted-foreground">Document not found</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/documents">Back to Documents</Link>
        </Button>
      </div>
    );
  }

  const StatusIcon = STATUS_ICON[doc.ocrStatus as keyof typeof STATUS_ICON] || Clock;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/documents" className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <ChevronLeft className="size-4" />
          Documents
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium truncate">{doc.title}</span>
      </div>

      {/* Main info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="size-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{doc.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 capitalize">
                  {doc.docType.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            {downloadUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Status", value: doc.ocrStatus, icon: StatusIcon, capitalize: true },
              { label: "Pages", value: doc.pageCount?.toString() ?? "Unknown", icon: Layers },
              { label: "Scope", value: doc.scope, icon: Scan, capitalize: true },
              { label: "Uploaded", value: new Date(doc.createdAt).toLocaleDateString(), icon: Clock },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className="size-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                </div>
                <p className={`text-sm font-medium ${item.capitalize ? "capitalize" : ""}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing status */}
      {job && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {job.status === "processing" && <Loader2 className="size-4 animate-spin text-primary" />}
              {job.status === "complete" && <CheckCircle2 className="size-4 text-emerald-500" />}
              {job.status === "failed" && <AlertCircle className="size-4 text-destructive" />}
              Processing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <Progress value={job.progress} className="flex-1" />
              <span className="text-sm font-medium tabular-nums w-12 text-right">{job.progress}%</span>
            </div>
            {job.error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {job.error}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {job.processedPages} / {job.totalPages ?? "?"} pages processed
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
