"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";

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

const SUGGESTED = [
  "What is the overhaul interval for the turbocharger?",
  "List the spare parts for the main engine fuel injector",
  "Safety procedures for enclosed space entry",
  "Torque specifications for cylinder head bolts",
];

export default function QueryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [vesselId, setVesselId] = useState<string>("all");
  const [vesselOptions, setVesselOptions] = useState<VesselOption[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/vessels")
      .then((res) => res.json())
      .then((data) => setVesselOptions(data.vessels || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || streaming) return;

    const question = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setStreaming(true);

    let assistantContent = "";
    let sources: Source[] = [];
    setMessages((prev) => [...prev, { role: "assistant", content: "", sources: [] }]);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, vesselId: vesselId !== "all" ? vesselId : undefined }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." };
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
              updated[updated.length - 1] = { role: "assistant", content: assistantContent, sources };
              return updated;
            });
          } else if (data.type === "sources") {
            sources = data.content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantContent, sources };
              return updated;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Connection error. Check your network and try again." };
        return updated;
      });
    }
    setStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-5 h-12 flex items-center justify-between shrink-0">
        <h1 className="text-sm font-semibold text-foreground">Ask AI</h1>
        <Select value={vesselId} onValueChange={setVesselId}>
          <SelectTrigger className="w-44 h-7 text-xs">
            <SelectValue placeholder="All vessels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vessels</SelectItem>
            {vesselOptions.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="py-16">
              <h2 className="text-lg font-semibold text-foreground">What do you want to know?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Ask about maintenance procedures, part numbers, or any technical detail in your documents.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-left px-3 py-2.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg bg-primary text-primary-foreground px-3.5 py-2.5 text-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="max-w-[90%]">
                  <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {msg.content || (streaming && i === messages.length - 1 ? (
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin" />
                        Thinking...
                      </span>
                    ) : "")}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {msg.sources.map((src, si) => (
                        <Badge key={si} variant="secondary" className="text-[11px] font-normal">
                          {src.title}{src.page_number ? `, p.${src.page_number}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 rounded-lg border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              aria-label="Ask a question about your documents"
              disabled={streaming}
              rows={1}
              className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-[120px]"
              style={{ minHeight: "40px" }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={streaming || !input.trim()}
              className="shrink-0 m-1 size-7"
              variant="ghost"
            >
              {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
