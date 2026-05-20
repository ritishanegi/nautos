"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Ship,
  Users,
  MessageSquareText,
  Zap,
  Clock,
  Loader2,
  BarChart3,
} from "lucide-react";

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

const STAT_CONFIG = [
  { key: "totalDocuments", label: "Documents", icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "totalVessels", label: "Vessels", icon: Ship, color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "totalUsers", label: "Team Members", icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
  { key: "totalQueries", label: "Total Queries", icon: MessageSquareText, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "queriesToday", label: "Queries Today", icon: Zap, color: "text-primary", bg: "bg-primary/10" },
];

const STATUS_COLORS: Record<string, string> = {
  complete: "bg-emerald-500",
  processing: "bg-blue-500",
  pending: "bg-amber-500",
  failed: "bg-destructive",
};

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
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxDaily = Math.max(...dailyQueries.map((d) => d.count), 1);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform usage and document processing metrics</p>
      </div>

      {/* Stats row */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STAT_CONFIG.map((stat) => (
            <Card key={stat.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`size-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`size-[18px] ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold tabular-nums">
                      {overview[stat.key as keyof Overview]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Avg response time card */}
      {overview && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Clock className="size-[18px] text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average Response Time</p>
              <p className="text-xl font-bold tabular-nums">
                {overview.avgResponseTimeMs > 0 ? `${(overview.avgResponseTimeMs / 1000).toFixed(1)}s` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Volume Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              Query Volume (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyQueries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No query data yet. Start asking questions to see trends.
              </p>
            ) : (
              <div className="flex items-end gap-[3px] h-40">
                {dailyQueries.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-primary/70 hover:bg-primary rounded-t-sm min-h-[2px] transition-all"
                        style={{ height: `${(day.count / maxDaily) * 140}px` }}
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border border-border rounded-md px-2 py-1 text-[10px] whitespace-nowrap shadow-lg z-10">
                        {day.count} queries
                        <br />
                        {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              Document Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {docsByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No documents uploaded yet.
              </p>
            ) : (
              <div className="space-y-4">
                {docsByStatus.map((ds) => {
                  const total = docsByStatus.reduce((sum, d) => sum + d.count, 0);
                  const pct = total > 0 ? (ds.count / total) * 100 : 0;
                  return (
                    <div key={ds.status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{ds.status}</span>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {ds.count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${STATUS_COLORS[ds.status] || "bg-muted-foreground"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
