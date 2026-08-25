"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citedPriorArtIds?: string[];
};

export function ChatPanel({ patentId }: { patentId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/patents/${patentId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(
          (data.messages ?? []).map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })),
        );
        setLoaded(true);
      });
  }, [patentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: text }]);

    try {
      const res = await fetch(`/api/patents/${patentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", content: data.error ?? "Something went wrong." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `resp-${Date.now()}`,
            role: "assistant",
            content: data.answer,
            citedPriorArtIds: data.cited_prior_art_ids,
          },
        ]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-260px)] flex-col rounded border border-outline-variant bg-surface">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-outline-variant px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary-container/20">
          <span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Intellect AI</h3>
          <p className="font-mono text-xs text-outline">Document context active</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-background/30 p-5">
        {loaded && messages.length === 0 && (
          <div className="flex justify-center">
            <span className="rounded-full border border-outline-variant/50 bg-surface-container-lowest px-3 py-1 font-mono text-[11px] text-outline">
              Ask a question about this patent to get started
            </span>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-xl rounded-tr-sm border border-outline-variant bg-surface-container-high p-4 text-on-surface shadow-sm"
                  : "w-[90%] max-w-[90%] rounded-xl border border-primary/20 bg-surface p-4 shadow-sm"
              }
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface/90">
                {m.content}
              </p>
              {!!m.citedPriorArtIds?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.citedPriorArtIds.map((cid) => (
                    <span
                      key={cid}
                      className="rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 font-mono text-[10px] text-primary"
                    >
                      {cid.slice(0, 8).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-end gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface">
              <span className="material-symbols-outlined text-[14px] text-outline">psychology</span>
            </div>
            <div className="flex h-10 items-center gap-1.5 rounded-lg rounded-tl-sm border border-outline-variant bg-surface px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:0.3s]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-outline-variant p-4">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Query IntellectFlow AI based on context…"
            className="w-full resize-none rounded-t border-0 border-b border-outline-variant bg-surface px-3 py-3 text-sm text-on-surface placeholder:text-outline focus:border focus:border-primary focus:outline-none focus:ring-0"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            className="absolute bottom-3 right-2 flex h-8 w-8 items-center justify-center rounded bg-primary text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
