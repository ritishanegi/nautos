"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Upload, Plus, CloudUpload, Loader2, FileUp } from "lucide-react";

interface Document {
  id: string;
  title: string;
  docType: string;
  scope: string;
  ocrStatus: string;
  pageCount: number | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Pending" },
  processing: { className: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Processing" },
  complete: { className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Complete" },
  failed: { className: "bg-destructive/10 text-destructive border-destructive/20", label: "Failed" },
};

const DOC_TYPES = [
  { value: "maintenance_manual", label: "Maintenance Manual" },
  { value: "spare_parts_catalog", label: "Spare Parts Catalog" },
  { value: "safety_certificate", label: "Safety Certificate" },
  { value: "inspection_report", label: "Inspection Report" },
  { value: "drawing", label: "Technical Drawing" },
  { value: "sds", label: "Safety Data Sheet" },
  { value: "other", label: "Other" },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

    const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
    if (res.ok) {
      setShowUpload(false);
      fetchDocuments();
    }
    setUploading(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage your maritime document library</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="size-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No documents yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Upload your first maritime document to get started
            </p>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="size-4 mr-2" />
              Upload Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const status = STATUS_STYLES[doc.ocrStatus] || STATUS_STYLES.pending;
                return (
                  <TableRow key={doc.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="font-medium hover:text-primary transition-colors flex items-center gap-2"
                      >
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        {doc.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {doc.docType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${status.className}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {doc.pageCount ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <UploadDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        onUpload={handleUpload}
        uploading={uploading}
      />
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  onUpload,
  uploading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, title: string, docType: string) => void;
  uploading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("maintenance_manual");
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setFile(null);
    setTitle("");
    setDocType("maintenance_manual");
  }

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
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Upload a PDF maritime document for AI processing</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border hover:border-muted-foreground/30"
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileUp className="size-5 text-emerald-500" />
                <div className="text-left">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="ml-auto text-xs">
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <CloudUpload className="size-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">Drag & drop a PDF here, or</p>
                <label className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  browse files
                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                </label>
                <p className="text-[11px] text-muted-foreground mt-2">PDF files up to 500MB</p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Document Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MAN B&W Engine Maintenance Manual"
            />
          </div>

          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => file && title && onUpload(file, title, docType)}
            disabled={!file || !title || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="size-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
