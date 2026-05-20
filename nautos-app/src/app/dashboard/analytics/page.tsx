"use client";

import { useEffect, useState } from "react";

interface Overview {
  totalDocuments: number;
  totalVessels: number;
  totalUsers: number;
  totalQueries: number;
  queriesToday: number;
  avgResponseTimeMs: number;
}

interface DailyQuery {
  date: string;
  count: number;
}

interface DocStatus {
  status: string;
  count: number;
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dailyQueries, setDailyQueries] = useState<DailyQuery[]>([]);
  const [docsByStatus, setDocsByStatus] = useState<DocStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        setOverview(data.overview);
        setDailyQueries(data.dailyQueries);
        setDocsByStatus(data.docsByStatus);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  const maxDaily = Math.max(...dailyQueries.map((d) => d.count), 1);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold text-white mb-8">Analytics</h2>

      <div>

        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard label="Documents" value={overview.totalDocuments} />
            <StatCard label="Vessels" value={overview.totalVessels} />
            <StatCard label="Team Members" value={overview.totalUsers} />
            <StatCard label="Total Queries" value={overview.totalQueries} />
            <StatCard label="Queries Today" value={overview.queriesToday} />
            <StatCard
              label="Avg Response"
              value={overview.avgResponseTimeMs > 0 ? `${(overview.avgResponseTimeMs / 1000).toFixed(1)}s` : "—"}
            />
          </div>
        )}

        {/* Query Volume Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Query Volume (Last 30 Days)</h3>
          {dailyQueries.length === 0 ? (
            <p className="text-slate-500 text-sm">No query data yet. Start asking questions to see trends.</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {dailyQueries.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-cyan-500/80 rounded-t min-h-[2px] transition-all"
                    style={{ height: `${(day.count / maxDaily) * 100}%` }}
                  />
                  <p className="text-[9px] text-slate-600 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                    {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Status Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Document Processing Status</h3>
          {docsByStatus.length === 0 ? (
            <p className="text-slate-500 text-sm">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {docsByStatus.map((ds) => {
                const total = docsByStatus.reduce((sum, d) => sum + d.count, 0);
                const pct = total > 0 ? (ds.count / total) * 100 : 0;
                const colors: Record<string, string> = {
                  complete: "bg-green-500",
                  processing: "bg-blue-500",
                  pending: "bg-yellow-500",
                  failed: "bg-red-500",
                };
                return (
                  <div key={ds.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300 capitalize">{ds.status}</span>
                      <span className="text-sm text-slate-400">{ds.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors[ds.status] || "bg-slate-600"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
