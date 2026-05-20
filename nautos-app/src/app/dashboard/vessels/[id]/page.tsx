"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

  useEffect(() => {
    load();
  }, [id]);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-red-400">Vessel not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard/vessels" className="text-slate-400 hover:text-white">&larr; Vessels</Link>
        <span className="text-slate-600">/</span>
        <span className="text-white font-medium">{vessel.name}</span>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Vessel Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">{vessel.name}</h1>
              {vessel.imo && <p className="text-slate-400 mt-1">IMO {vessel.imo}</p>}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${vessel.isActive ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"}`}>
              {vessel.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Type</p>
              <p className="text-sm text-white mt-1">{vessel.vesselType || "—"}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Flag State</p>
              <p className="text-sm text-white mt-1">{vessel.flagState || "—"}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Added</p>
              <p className="text-sm text-white mt-1">{new Date(vessel.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Equipment ({equipmentList.length})</h2>
            <button
              onClick={() => setShowAddEquipment(true)}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
            >
              Add Equipment
            </button>
          </div>
          {equipmentList.length === 0 ? (
            <p className="text-slate-500 text-sm">No equipment linked to this vessel yet.</p>
          ) : (
            <div className="space-y-2">
              {equipmentList.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{eq.manufacturer} — {eq.modelType}</p>
                    {eq.serialNumber && <p className="text-slate-500 text-xs">S/N: {eq.serialNumber}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Documents ({documents.length})</h2>
            <Link
              href="/dashboard/documents"
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Upload New
            </Link>
          </div>
          {documents.length === 0 ? (
            <p className="text-slate-500 text-sm">No documents linked to this vessel yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3 hover:bg-slate-800 transition-colors"
                >
                  <div>
                    <p className="text-white text-sm">{doc.title}</p>
                    <p className="text-slate-500 text-xs">{doc.docType.replace(/_/g, " ")}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    doc.ocrStatus === "complete" ? "bg-green-500/10 text-green-400" :
                    doc.ocrStatus === "failed" ? "bg-red-500/10 text-red-400" :
                    "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {doc.ocrStatus}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {showAddEquipment && (
        <AddEquipmentModal onClose={() => setShowAddEquipment(false)} onAdd={handleAddEquipment} />
      )}
    </div>
  );
}

function AddEquipmentModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (eq: { manufacturer: string; modelType: string; serialNumber: string }) => void;
}) {
  const [manufacturer, setManufacturer] = useState("");
  const [modelType, setModelType] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Add Equipment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Manufacturer *</label>
            <input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="MAN B&W"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Model / Type *</label>
            <input
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="6S60ME-C8.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Serial Number</label>
            <input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="ME-C8-2024-0147"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => manufacturer && modelType && onAdd({ manufacturer, modelType, serialNumber })}
            disabled={!manufacturer || !modelType}
            className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            Add Equipment
          </button>
        </div>
      </div>
    </div>
  );
}
