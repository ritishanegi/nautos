"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MessageSquareText,
  Ship,
  ArrowRight,
  Upload,
  Anchor,
  Sparkles,
  Loader2,
} from "lucide-react";

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

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back. Here&apos;s an overview of your platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Badge variant="secondary" className="capitalize">{user.role}</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Documents",
            value: "0",
            desc: "Upload manuals to get started",
            icon: FileText,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            label: "Queries Today",
            value: "0",
            desc: "Ask questions about your documents",
            icon: MessageSquareText,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Vessels",
            value: "0",
            desc: "Add your fleet vessels",
            icon: Ship,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-2">{stat.desc}</p>
                </div>
                <div className={`size-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              href: "/dashboard/query",
              icon: Sparkles,
              title: "Ask AI a Question",
              desc: "Query your documents using natural language and get AI-powered answers with citations.",
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              href: "/dashboard/documents",
              icon: Upload,
              title: "Upload Documents",
              desc: "Upload maintenance manuals, spare parts catalogs, and technical documents.",
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              href: "/dashboard/vessels",
              icon: Anchor,
              title: "Manage Fleet",
              desc: "Add vessels, link equipment, and organize your fleet documentation.",
              color: "text-amber-400",
              bg: "bg-amber-500/10",
            },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="h-full hover:border-primary/30 transition-all duration-200 group cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`size-10 rounded-lg ${action.bg} flex items-center justify-center`}>
                      <action.icon className={`size-5 ${action.color}`} />
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-base mt-3">{action.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription>{action.desc}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
