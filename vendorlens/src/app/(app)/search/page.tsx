"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Send,
  Sparkles,
  Loader2,
  MessageSquare,
  Building2,
  FileText,
  Copy,
  Bot,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: {
    vendorsFound: number;
    totalVendors: number;
    totalContracts: number;
    duplicateGroups: number;
  };
  timestamp: Date;
}

const suggestedQuestions = [
  "Do we already use a CRM?",
  "When does our Slack contract renew?",
  "Are we paying for two design tools?",
  "What are our top 5 vendors by spend?",
  "Which contracts are auto-renewing soon?",
  "Show me all engineering department tools",
];

export default function SearchPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(question?: string) {
    const q = question || input.trim();
    if (!q || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Search failed";
      toast.error(message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <Header
        title="AI Search Assistant"
        description="Ask anything about your vendors, contracts, and tools"
      />

      <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Ask VendorLens AI
              </h2>
              <p className="text-slate-500 max-w-md mb-8">
                I can help you find vendors, check contract renewals, identify
                duplicate tools, and answer questions about your organization&apos;s
                software portfolio.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSubmit(q)}
                    className="text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm text-slate-700 hover:text-slate-900"
                  >
                    <MessageSquare className="h-4 w-4 text-blue-500 mb-1" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 shadow-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="text-sm leading-relaxed text-slate-700 mb-2 last:mb-0">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-slate-900">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-slate-600">{children}</em>
                          ),
                          ul: ({ children }) => (
                            <ul className="mt-1 mb-2 space-y-1 pl-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mt-1 mb-2 space-y-1 pl-1 list-decimal list-inside">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-sm text-slate-700 flex gap-2">
                              <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                              <span>{children}</span>
                            </li>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-base font-bold text-slate-900 mb-1 mt-2">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-sm font-bold text-slate-900 mb-1 mt-2">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-semibold text-slate-800 mb-1 mt-2">{children}</h3>
                          ),
                          code: ({ children }) => (
                            <code className="bg-slate-100 text-slate-800 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                          ),
                          hr: () => <hr className="my-2 border-slate-200" />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}

                    {msg.sources && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <Badge variant="secondary" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {msg.sources.totalVendors} vendors
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {msg.sources.totalContracts} contracts
                        </Badge>
                        {msg.sources.duplicateGroups > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            {msg.sources.duplicateGroups} duplicates
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <Card className="max-w-md">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      <span className="text-sm text-slate-500">
                        Searching your vendor data...
                      </span>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-slate-50 pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="relative"
          >
            <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-lg px-4 py-2 focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 transition-all">
              <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about vendors, contracts, renewals..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400 py-2"
                disabled={loading}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || loading}
                className="rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
              VendorLens AI only searches your internal vendor data.
              Results are AI-generated and should be verified.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
