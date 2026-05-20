"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Source {
  document_id: string;
  title: string;
  page_number: number | null;
  scope: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface VesselOption {
  id: string;
  name: string;
}

export default function QueryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [vesselId, setVesselId] = useState<string>("");
  const [vesselOptions, setVesselOptions] = useState<VesselOption[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/vessels")
      .then((res) => res.json())
      .then((data) => setVesselOptions(data.vessels || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setStreaming(true);

    let assistantContent = "";
    let sources: Source[] = [];

    setMessages((prev) => [...prev, { role: "assistant", content: "", sources: [] }]);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, vesselId: vesselId || undefined }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "text") {
            assistantContent += data.content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
                sources,
              };
              return updated;
            });
          } else if (data.type === "sources") {
            sources = data.content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: assistantContent,
                sources,
              };
              return updated;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Connection error. Please check your network and try again.",
        };
        return updated;
      });
    }

    setStreaming(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-white">Ask AI</h2>
        <div className="flex items-center gap-3">
          <select
            value={vesselId}
            onChange={(e) => setVesselId(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All vessels</option>
            {vesselOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-24">
            <h2 className="text-2xl font-semibold text-white mb-2">Ask anything about your documents</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Ask questions about maintenance procedures, part numbers, inspection intervals, or any technical detail in your uploaded manuals.
            </p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {[
                "What is the overhaul interval for the turbocharger?",
                "List the spare parts for the main engine fuel injector",
                "What are the safety procedures for enclosed space entry?",
                "Find the torque specifications for cylinder head bolts",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-left px-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:border-cyan-500/50 hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-3xl rounded-xl px-5 py-3 ${
                msg.role === "user"
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content || (streaming && i === messages.length - 1 ? "Thinking..." : "")}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src, si) => (
                      <span
                        key={si}
                        className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300"
                      >
                        {src.title} {src.page_number ? `(p.${src.page_number})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 px-6 py-4 shrink-0"
      >
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={streaming}
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
