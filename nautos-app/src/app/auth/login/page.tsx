
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex bg-[#0a1628] text-slate-200 relative overflow-hidden">
      {/* Left — Brand Panel */}
      <div className="relative hidden lg:flex lg:w-[480px] flex-col justify-between p-10 border-r border-slate-700/50 bg-[#0a1628] z-10">
        
        {/* Subtle Grid Pattern for left side */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(74,122,168,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(74,122,168,0.05) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        {/* Logo Header */}
        <div className="relative z-10 flex items-center gap-2 text-lg font-semibold tracking-wide text-white">
          <div className="w-5 h-5 rounded-full border border-amber-500" />
          nautos
        </div>

        {/* Core Messaging */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="block w-6 h-px bg-amber-500 opacity-50" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-500 font-mono">
              Secure Access Portal
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight text-white mb-4">
            Maritime intelligence <br />
            <em className="italic text-slate-400 font-light">at your command.</em>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-[320px]">
            Authenticate to access fleet-wide technical manuals, compliance records, and your dedicated AI co-pilot.
          </p>
        </div>

        {/* Footer Telemetry */}
        <div className="relative z-10 flex justify-between items-center text-[10px] uppercase text-slate-500 font-mono">
          <span>Martech Systems</span>
          <span>SYS_VER: 2.4.1</span>
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className="flex-1 relative flex items-center justify-center px-6">
        
        {/* Background image with light overlay for readability */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/images/venti-views-1cqIcrWFQBI-unsplash.jpg"
            alt="Ship Background"
            fill
            className="object-cover object-center brightness-100 contrast-100"
            priority
          />
        </div>

        {/* Overlay to ensure form readability */}
        <div className="absolute inset-0 z-5 bg-[#0a1628]/30 backdrop-blur-sm" />

        {/* Form Container */}
        <div className="w-full max-w-sm relative z-10 bg-[#0a1628]/40 p-8 border border-slate-700/50 shadow-2xl rounded-sm backdrop-blur-md">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-semibold text-white tracking-tight">System Login</h2>
            <p className="mt-2 text-sm text-slate-400 font-mono">
              ENTER_CREDENTIALS_TO_PROCEED
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400 font-mono text-center">
                ERR: {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 font-mono text-xs uppercase tracking-wider">Email Designation</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                required 
                placeholder="crew@vessel.com" 
                autoComplete="email" 
                className="bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/50 rounded-none h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 font-mono text-xs uppercase tracking-wider">Passcode</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  placeholder="••••••••" 
                  autoComplete="current-password" 
                  className="bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/50 rounded-none h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm uppercase font-semibold rounded-none h-11 tracking-wide mt-2"
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "AUTHENTICATING..." : "INITIALIZE SESSION"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/50 text-center text-sm text-slate-400">
            Unregistered vessel?{" "}
            <Link href="/auth/register" className="font-medium text-amber-500 hover:text-amber-400 hover:underline transition-colors">
              Request access clearance
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
