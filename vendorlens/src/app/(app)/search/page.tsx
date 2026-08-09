"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Search,
  Send,
  Sparkles,
  Loader2,
  MessageSquare,
  Bot,
  User,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: {
    chunksRetrieved?: number;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function startEdit(msg: ChatMessage) {
    if (loading || msg.role !== "user") return;
    setEditingId(msg.id);
    setEditDraft(msg.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function submitQuestion(
    question: string,
    priorMessages: ChatMessage[] = messages
  ) {
    const q = question.trim();
    if (!q || loading) return;

    const history = priorMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: q,
      timestamp: new Date(),
    };

    setMessages([...priorMessages, userMessage]);
    setInput("");
    setEditingId(null);
    setEditDraft("");
    setLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
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

  async function handleSubmit(question?: string) {
    await submitQuestion(question || input);
  }

  async function saveEdit(messageId: string) {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;
    const priorMessages = messages.slice(0, index);
    await submitQuestion(editDraft, priorMessages);
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
              <div className="h-16 w-16 rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-slate-400" />
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
                  className={`group flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-lg bg-white/80 backdrop-blur-sm border border-white/70 shadow-sm flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-slate-500" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-slate-800 text-white"
                        : "bg-white/80 backdrop-blur-md border border-white/70 shadow-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      editingId === msg.id ? (
                        <div className="space-y-2 min-w-[240px]">
                          <Textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEdit();
                              }
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                void saveEdit(msg.id);
                              }
                            }}
                            className="min-h-[72px] text-sm bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 resize-none"
                            disabled={loading}
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                              disabled={loading}
                              className="h-7 px-2 text-slate-300 hover:text-white hover:bg-slate-700"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void saveEdit(msg.id)}
                              disabled={!editDraft.trim() || loading}
                              className="h-7 px-2 bg-white text-slate-900 hover:bg-slate-100"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      )
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

                  </div>
                  {msg.role === "user" && (
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-600" />
                      </div>
                      {editingId !== msg.id && (
                        <button
                          type="button"
                          onClick={() => startEdit(msg)}
                          disabled={loading || editingId !== null}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-opacity disabled:opacity-0"
                          aria-label="Edit message"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/80 backdrop-blur-sm border border-white/70 shadow-sm flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="max-w-md rounded-2xl bg-white/80 backdrop-blur-md border border-white/70 shadow-sm px-4 py-3 flex items-center gap-3">
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                    <span className="text-sm text-slate-400">Searching your vendor data...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-transparent pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="relative"
          >
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-2xl border border-white/70 shadow-md px-4 py-2 focus-within:ring-2 focus-within:ring-slate-300 focus-within:ring-offset-2 transition-all">
              <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about vendors, contracts, renewals..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400 py-2"
                disabled={loading || editingId !== null}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || loading || editingId !== null}
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
