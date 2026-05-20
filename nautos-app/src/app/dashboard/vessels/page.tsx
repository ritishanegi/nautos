"use client";

import { useEffect, useState } from "react";
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">Fleet Vessels</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Add Vessel
        </button>
      </div>

      <div>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : vessels.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-slate-400 mb-4">No vessels added yet</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
            >
              Add Your First Vessel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vessels.map((v) => (
              <Link
                key={v.id}
                href={`/dashboard/vessels/${v.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{v.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${v.isActive ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                    {v.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {v.imo && <p className="text-sm text-slate-400">IMO {v.imo}</p>}
                {v.vesselType && <p className="text-sm text-slate-500 mt-1">{v.vesselType}</p>}
                {v.flagState && <p className="text-sm text-slate-500">{v.flagState}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddVesselModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  );
}

function AddVesselModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (v: { name: string; imo: string; vesselType: string; flagState: string }) => void;
}) {
  const [name, setName] = useState("");
  const [imo, setImo] = useState("");
  const [vesselType, setVesselType] = useState("");
  const [flagState, setFlagState] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Add Vessel</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Vessel Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="M/V Pacific Star"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">IMO Number</label>
            <input
              value={imo}
              onChange={(e) => setImo(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="9274848"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Vessel Type</label>
            <select
              value={vesselType}
              onChange={(e) => setVesselType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select type</option>
              <option value="Bulk Carrier">Bulk Carrier</option>
              <option value="Container Ship">Container Ship</option>
              <option value="Tanker">Tanker</option>
              <option value="LNG Carrier">LNG Carrier</option>
              <option value="Offshore Supply">Offshore Supply</option>
              <option value="Tugboat">Tugboat</option>
              <option value="Passenger">Passenger</option>
              <option value="General Cargo">General Cargo</option>
              <option value="FPSO">FPSO</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Flag State</label>
            <input
              value={flagState}
              onChange={(e) => setFlagState(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Panama"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => name && onAdd({ name, imo, vesselType, flagState })}
            disabled={!name}
            className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            Add Vessel
          </button>
        </div>
      </div>
    </div>
  );
}
