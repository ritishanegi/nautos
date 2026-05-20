"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Sparkles,
  User,
  Bot,
  FileText,
  Loader2,
  Ship,
} from "lucide-react";

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

const SUGGESTED_QUESTIONS = [
  "What is the overhaul interval for the turbocharger?",
  "List the spare parts for the main engine fuel injector",
  "What are the safety procedures for enclosed space entry?",
  "Find the torque specifications for cylinder head bolts",
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
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Connection error. Please check your network and try again.",
        };
        return updated;
      });
    }

    setStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-[18px] text-primary" />
          <h1 className="text-sm font-semibold">Ask AI</h1>
        </div>
        <Select value={vesselId} onValueChange={setVesselId}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <Ship className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Select vessel" />
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
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="mx-auto mb-6 size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="size-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Ask anything about your documents</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Ask about maintenance procedures, part numbers, inspection intervals,
                or any technical detail in your uploaded manuals.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-left px-4 py-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-accent transition-all duration-150"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="size-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
                <Card className={`px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card"
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content || (streaming && i === messages.length - 1 ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        Thinking...
                      </span>
                    ) : "")}
                  </p>
                  {msg.sources && msg.sources.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                          <FileText className="size-3" />
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, si) => (
                            <Badge key={si} variant="secondary" className="text-[11px] font-normal">
                              {src.title} {src.page_number ? `p.${src.page_number}` : ""}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </div>
              {msg.role === "user" && (
                <div className="size-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="size-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              disabled={streaming}
              rows={1}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-32"
              style={{ minHeight: "44px" }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={streaming || !input.trim()}
              className="shrink-0 m-1.5 size-8"
            >
              {streaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            AI answers are generated from your uploaded documents. Always verify critical information.
          </p>
        </form>
      </div>
    </div>
  );
}
