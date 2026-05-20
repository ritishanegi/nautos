"use client";

import { useEffect, useState } from "react";
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
import { Ship, Plus, Anchor, MapPin, Flag, ArrowRight, Loader2 } from "lucide-react";

interface Vessel {
  id: string;
  name: string;
  imo: string | null;
  vesselType: string | null;
  flagState: string | null;
  isActive: boolean;
  createdAt: string;
}

const VESSEL_TYPES = [
  "Bulk Carrier", "Container Ship", "Tanker", "LNG Carrier",
  "Offshore Supply", "Tugboat", "Passenger", "General Cargo", "FPSO", "Other",
];

export default function VesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function fetchVessels() {
    const res = await fetch("/api/vessels");
    if (res.ok) {
      const data = await res.json();
      setVessels(data.vessels);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchVessels();
  }, []);

  async function handleAdd(vessel: { name: string; imo: string; vesselType: string; flagState: string }) {
    const res = await fetch("/api/vessels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vessel),
    });
    if (res.ok) {
      setShowAdd(false);
      fetchVessels();
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Vessels</h1>
          <p className="text-muted-foreground mt-1">Manage your fleet and linked equipment</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="size-4 mr-2" />
          Add Vessel
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : vessels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="size-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Ship className="size-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No vessels yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Add your first vessel to start organizing documents by ship</p>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="size-4 mr-2" />
              Add Your First Vessel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vessels.map((v) => (
            <Link key={v.id} href={`/dashboard/vessels/${v.id}`}>
              <Card className="h-full hover:border-primary/30 transition-all duration-200 group cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Ship className="size-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{v.name}</h3>
                        {v.imo && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Anchor className="size-3" />
                            IMO {v.imo}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={v.isActive ? "default" : "secondary"} className="text-[10px]">
                      {v.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {v.vesselType && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {v.vesselType}
                      </span>
                    )}
                    {v.flagState && (
                      <span className="flex items-center gap-1">
                        <Flag className="size-3" />
                        {v.flagState}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end mt-3">
                    <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddVesselDialog open={showAdd} onOpenChange={setShowAdd} onAdd={handleAdd} />
    </div>
  );
}

function AddVesselDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (v: { name: string; imo: string; vesselType: string; flagState: string }) => void;
}) {
  const [name, setName] = useState("");
  const [imo, setImo] = useState("");
  const [vesselType, setVesselType] = useState("");
  const [flagState, setFlagState] = useState("");

  function reset() { setName(""); setImo(""); setVesselType(""); setFlagState(""); }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Vessel</DialogTitle>
          <DialogDescription>Add a new vessel to your fleet</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Vessel Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="M/V Pacific Star" />
          </div>
          <div className="space-y-2">
            <Label>IMO Number</Label>
            <Input value={imo} onChange={(e) => setImo(e.target.value)} placeholder="9274848" />
          </div>
          <div className="space-y-2">
            <Label>Vessel Type</Label>
            <Select value={vesselType} onValueChange={setVesselType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {VESSEL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Flag State</Label>
            <Input value={flagState} onChange={(e) => setFlagState(e.target.value)} placeholder="Panama" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (name) { onAdd({ name, imo, vesselType, flagState }); reset(); } }} disabled={!name}>
            Add Vessel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
