"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirm = form.get("confirmPassword") as string;

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password,
        name: form.get("name"),
        companyName: form.get("companyName"),
        subdomain: form.get("subdomain"),
      }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Registration failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Register</h1>
          <p className="mt-2 text-slate-400">Set up your company on NAUTOS AI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
              Your Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-300 mb-1">
              Company Name
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              minLength={2}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Acme Shipping Ltd"
            />
          </div>

          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-slate-300 mb-1">
              Subdomain
            </label>
            <div className="flex items-center">
              <input
                id="subdomain"
                name="subdomain"
                type="text"
                required
                minLength={3}
                maxLength={63}
                pattern="[a-z0-9-]+"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-l-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="acme-shipping"
              />
              <span className="px-3 py-3 bg-slate-700 border border-slate-600 rounded-r-lg text-slate-400 text-sm">
                .nautos.ai
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Repeat password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
