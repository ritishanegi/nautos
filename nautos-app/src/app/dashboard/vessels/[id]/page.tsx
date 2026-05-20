"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ship,
  ChevronLeft,
  Plus,
  Anchor,
  Flag,
  MapPin,
  Clock,
  Wrench,
  FileText,
  Loader2,
  AlertCircle,
  Upload,
} from "lucide-react";

interface Vessel {
  id: string;
  name: string;
  imo: string | null;
  vesselType: string | null;
  flagState: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Equipment {
  id: string;
  manufacturer: string;
  modelType: string;
  serialNumber: string | null;
}

interface Document {
  id: string;
  title: string;
  docType: string;
  ocrStatus: string;
}

export default function VesselDetailPage() {
  const { id } = useParams();
  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEquipment, setShowAddEquipment] = useState(false);

  async function load() {
    const res = await fetch(`/api/vessels/${id}`);
    if (res.ok) {
      const data = await res.json();
      setVessel(data.vessel);
      setEquipmentList(data.equipment);
      setDocuments(data.documents);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleAddEquipment(eq: { manufacturer: string; modelType: string; serialNumber: string }) {
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...eq, vesselId: id }),
    });
    if (res.ok) {
      setShowAddEquipment(false);
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-muted-foreground">Vessel not found</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/vessels">Back to Fleet</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/vessels" className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <ChevronLeft className="size-4" />
          Fleet
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium truncate">{vessel.name}</span>
      </div>

      {/* Vessel info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Ship className="size-6 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-xl">{vessel.name}</CardTitle>
                {vessel.imo && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Anchor className="size-3.5" />
                    IMO {vessel.imo}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={vessel.isActive ? "default" : "secondary"}>
              {vessel.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Type", value: vessel.vesselType || "—", icon: MapPin },
              { label: "Flag State", value: vessel.flagState || "—", icon: Flag },
              { label: "Added", value: new Date(vessel.createdAt).toLocaleDateString(), icon: Clock },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className="size-3.5 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                </div>
                <p className="text-sm font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" />
            Equipment ({equipmentList.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAddEquipment(true)}>
            <Plus className="size-3.5 mr-1.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {equipmentList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No equipment linked to this vessel yet.
            </p>
          ) : (
            <div className="space-y-2">
              {equipmentList.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{eq.manufacturer} — {eq.modelType}</p>
                    {eq.serialNumber && (
                      <p className="text-xs text-muted-foreground mt-0.5">S/N: {eq.serialNumber}</p>
                    )}
                  </div>
                  <Wrench className="size-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            Documents ({documents.length})
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/documents">
              <Upload className="size-3.5 mr-1.5" />
              Upload
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No documents linked to this vessel yet.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{doc.docType.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      doc.ocrStatus === "complete" ? "default" :
                      doc.ocrStatus === "failed" ? "destructive" : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {doc.ocrStatus}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Equipment Dialog */}
      <AddEquipmentDialog
        open={showAddEquipment}
        onOpenChange={setShowAddEquipment}
        onAdd={handleAddEquipment}
      />
    </div>
  );
}

function AddEquipmentDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (eq: { manufacturer: string; modelType: string; serialNumber: string }) => void;
}) {
  const [manufacturer, setManufacturer] = useState("");
  const [modelType, setModelType] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  function reset() { setManufacturer(""); setModelType(""); setSerialNumber(""); }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Equipment</DialogTitle>
          <DialogDescription>Link equipment to this vessel</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Manufacturer *</Label>
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="MAN B&W" />
          </div>
          <div className="space-y-2">
            <Label>Model / Type *</Label>
            <Input value={modelType} onChange={(e) => setModelType(e.target.value)} placeholder="6S60ME-C8.5" />
          </div>
          <div className="space-y-2">
            <Label>Serial Number</Label>
            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="ME-C8-2024-0147" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (manufacturer && modelType) { onAdd({ manufacturer, modelType, serialNumber }); reset(); } }} disabled={!manufacturer || !modelType}>
            Add Equipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
