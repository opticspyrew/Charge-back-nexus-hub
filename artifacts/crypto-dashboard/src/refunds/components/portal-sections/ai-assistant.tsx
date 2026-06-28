import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { getAiThread } from "../../data/mocks";
import type { AiMessage } from "../../data/types";

const CANNED_REPLY =
  "I cannot take recovery actions on my own. A licensed analyst must review and authorize any freeze request, exchange contact, or counsel filing. I can summarize on-chain activity, surface risk patterns, and draft analyst-ready notes.";

export default function AiAssistant() {
  const [messages, setMessages] = useState<AiMessage[]>(() => getAiThread());
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  const handleSend = () => {
    const value = draft.trim();
    if (!value) return;
    const user: AiMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      body: value,
      at: new Date().toISOString(),
    };
    setMessages((m) => [...m, user]);
    setDraft("");
    setThinking(true);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `local-${Date.now() + 1}`,
          role: "assistant",
          body: CANNED_REPLY,
          at: new Date().toISOString(),
        },
      ]);
      setThinking(false);
    }, 700);
  };

  return (
    <div className="refunds-glass rounded-2xl flex flex-col h-[calc(100vh-12rem)] min-h-[500px] overflow-hidden">
      <header className="flex items-center justify-between gap-3 p-5 border-b border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Netspy-World Forensics AI</h2>
            <p className="text-[11px] text-muted-foreground">
              Read-only — drafts summaries and surfaces patterns. Cannot act on the chain or contact counterparties.
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-primary/10 border border-primary/25 text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary refunds-pulse-ring" />
          Model online
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => {
          const isAssistant = m.role === "assistant";
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                  isAssistant
                    ? "bg-primary/15 border border-primary/30 text-primary"
                    : "bg-card border border-card-border text-foreground"
                }`}
              >
                {isAssistant ? "AI" : "You"}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isAssistant
                    ? "bg-card/70 border border-card-border text-foreground"
                    : "bg-primary/10 border border-primary/25 text-foreground"
                }`}
              >
                <p>{m.body}</p>
                {m.citations && m.citations.length > 0 && (
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Sources: {m.citations.join(", ")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold flex items-center justify-center">
              AI
            </div>
            <div className="rounded-2xl px-4 py-3 bg-card/70 border border-card-border text-sm text-muted-foreground">
              <span className="inline-flex gap-1" aria-label="Assistant is composing a response">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-4 border-t border-card-border flex items-center gap-2"
      >
        <label htmlFor="ai-input" className="sr-only">Ask the assistant</label>
        <input
          id="ai-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about the path of funds, risk patterns, or next-step recommendations…"
          className="flex-1 px-3 py-2 bg-muted border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thinking}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </form>
    </div>
  );
}
