import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  const features = [
    {
      num: "01",
      title: "Document processing",
      desc: "OCR extracts text, tables, and key-value pairs from scanned PDFs. Documents are chunked, embedded, and indexed automatically.",
    },
    {
      num: "02",
      title: "AI-powered search",
      desc: "Hybrid search combines keyword matching with semantic understanding. Part numbers, IMO codes, and technical terms are found exactly.",
    },
    {
      num: "03",
      title: "Fleet-wide knowledge",
      desc: "Documents are scoped to vessels, shared across your fleet, or contributed to a master library that benefits every client.",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a1628] text-white relative">
      {/* Existing Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(74,122,168,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(74,122,168,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      {/* NEW: Ship Background Image */}
      <div className="absolute right-0 top-0 w-full md:w-[70%] h-[80vh] pointer-events-none z-0 overflow-hidden opacity-30 mix-blend-screen">
        <Image
          src="/istockphoto-1317779371-612x612.jpg"
          alt="Maritime Ship"
          fill
          className="object-cover object-right"
          priority
        />
        {/* Gradient mask to smoothly fade the image into the dark background on the left and bottom */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628] via-[#0a1628]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] to-transparent" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-10 py-4 border-b border-slate-700 backdrop-blur-sm bg-[#0a1628]/50">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-wide text-white">
          <div className="w-5 h-5 rounded-full border border-amber-500" />
          nautos
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-xs uppercase text-slate-300 hover:text-white"
            asChild
          >
            <Link href="/auth/login">Log in</Link>
          </Button>
          <Button
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs uppercase rounded-none px-4 h-8"
            asChild
          >
            <Link href="/auth/register">Start free trial</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 flex flex-col items-start justify-center px-10 py-32 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <span className="block w-8 h-px bg-amber-500 opacity-50" />
          <span className="text-xs uppercase tracking-[0.25em] text-amber-500">
            Maritime Intelligence Platform
          </span>
          <span className="block w-8 h-px bg-amber-500 opacity-50" />
        </div>

        <h1 className="text-6xl font-bold leading-tight tracking-tight mb-6 max-w-3xl">
          Find answers in your
          <br />
          <em className="italic text-slate-200">maritime documents</em>
        </h1>

        <p className="text-lg text-slate-300 max-w-xl mb-10">
          Upload maintenance manuals and technical documents. Ask questions in plain English.
          Get answers with exact page citations.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm uppercase font-semibold rounded-none px-8 h-12"
            asChild
          >
            <Link href="/auth/register">Get started</Link>
          </Button>
          <Button
            variant="outline"
            className="border-slate-600 bg-slate-800/50 backdrop-blur-sm text-slate-200 hover:text-white hover:bg-slate-800 text-sm uppercase font-semibold rounded-none px-8 h-12"
            asChild
          >
            <Link href="/auth/login">Log in</Link>
          </Button>
        </div>

        <span className="absolute bottom-4 left-10 text-[10px] uppercase text-slate-500 font-mono">
          25°47′N 80°13′W
        </span>
        <span className="absolute bottom-4 right-10 text>
        </main>
        