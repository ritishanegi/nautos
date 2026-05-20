import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Ship, FileText, Brain, Shield, ArrowRight, Waves } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Waves className="size-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              NAUTOS <span className="text-primary">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        <div className="relative">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-8">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Enterprise Maritime Intelligence
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
              Document Intelligence
              <br />
              <span className="text-primary">for Maritime</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Upload maintenance manuals, ask questions in natural language,
              get AI-powered answers with exact page citations. Built for ship
              managers and marine engineers.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/auth/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/auth/login">Sign In to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-24 max-w-5xl w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: FileText,
              title: "Smart OCR",
              desc: "Extract text, tables & key-value pairs from scanned maritime documents",
            },
            {
              icon: Brain,
              title: "AI-Powered Q&A",
              desc: "Ask questions about your manuals and get answers with page citations",
            },
            {
              icon: Ship,
              title: "Fleet Management",
              desc: "Organize documents by vessel and equipment across your entire fleet",
            },
            {
              icon: Shield,
              title: "Enterprise Security",
              desc: "Multi-tenant isolation, encrypted storage, and role-based access control",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-card/80 transition-all duration-200"
            >
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <f.icon className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-muted-foreground">
          <p>NAUTOS AI by Martech Systems</p>
          <p>Maritime Document Intelligence</p>
        </div>
      </footer>
    </main>
  );
}
