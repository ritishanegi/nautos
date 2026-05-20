"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push("/auth/login"));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-white">Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{user.email}</span>
          <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded">{user.role}</span>
        </div>
      </div>

      <div className="max-w-7xl">
        <h2 className="text-2xl font-semibold text-white mb-8">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-slate-400 text-sm font-medium">Documents</h3>
            <p className="text-3xl font-bold text-white mt-2">0</p>
            <p className="text-slate-500 text-sm mt-1">Upload manuals to get started</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-slate-400 text-sm font-medium">Queries Today</h3>
            <p className="text-3xl font-bold text-white mt-2">0</p>
            <p className="text-slate-500 text-sm mt-1">Ask questions about your documents</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-slate-400 text-sm font-medium">Vessels</h3>
            <p className="text-3xl font-bold text-white mt-2">0</p>
            <p className="text-slate-500 text-sm mt-1">Add your fleet vessels</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/dashboard/query"
            className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Ask a Question</h3>
            <p className="text-slate-400 text-sm">
              Query your documents using natural language and get AI-powered answers with citations.
            </p>
          </Link>
          <Link
            href="/dashboard/documents"
            className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Upload Documents</h3>
            <p className="text-slate-400 text-sm">
              Upload maintenance manuals, spare parts catalogs, and technical documents.
            </p>
          </Link>
          <Link
            href="/dashboard/vessels"
            className="block bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Manage Fleet</h3>
            <p className="text-slate-400 text-sm">
              Add vessels, link equipment, and organize your fleet.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
