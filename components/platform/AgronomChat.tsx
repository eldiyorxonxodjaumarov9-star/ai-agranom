"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/chat/types";
import { streamAgronomReply } from "@/lib/api/agronom";
import {
  getOrCreateSessionId,
  resetSessionId,
} from "@/lib/chat/storage";
import {
  type Conversation,
  generateId,
  getActiveConversationId,
  loadConversations,
  saveConversations,
  setActiveConversationId,
  sortConversations,
  titleFromMessage,
} from "@/lib/chat/conversations";
import { stripAgentMeta } from "@/lib/platform/agent-meta";
import {
  detectCropFromText,
  getCropContextBlock,
  loadCropMemory,
  upsertCropChat,
} from "@/lib/platform/crop-memory";
import { createSpeechRecognition } from "@/lib/platform/voice";
import { weatherPromptBlock } from "@/lib/platform/weather";
import type { WeatherSnapshot } from "@/lib/platform/types";

const ERROR_MESSAGE =
  "Kechirasiz, hozir javob berishda muammo bo'ldi. Iltimos, qayta urinib ko'ring.";

const MAX_IMAGES = 10;

export interface AgronomChatHandle {
  focus: () => void;
  startVoice: () => void;
  openImages: () => void;
  sendPrompt: (text: string) => void;
}

interface AgronomChatProps {
  weather?: WeatherSnapshot | null;
  chatRef?: React.MutableRefObject<AgronomChatHandle | null>;
}

export default function AgronomChat({ weather, chatRef }: AgronomChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<(t?: string) => Promise<void>>(async () => {});

  useEffect(() => {
    const convos = loadConversations();
    setConversations(convos);
    const active = getActiveConversationId();
    const found = convos.find((c) => c.id === active) || convos[0];
    if (found) {
      setActiveId(found.id);
      setMessages(found.messages);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !activeId) return;
    setConversations((prev) => {
      const next = sortConversations(
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: messages.filter((m) => !m.isStreaming),
                updatedAt: new Date().toISOString(),
                title:
                  (c.title === "Yangi suhbat" || !c.title) &&
                  messages[0]?.role === "user"
                    ? titleFromMessage(messages[0].content)
                    : c.title,
              }
            : c
        )
      );
      saveConversations(next);
      return next;
    });
  }, [messages, activeId, hydrated]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    const close = () => setMenuId(null);
    if (menuId) {
      window.addEventListener("click", close);
      return () => window.removeEventListener("click", close);
    }
  }, [menuId]);

  const ensureConversation = useCallback(() => {
    if (activeId) return activeId;
    const id = generateId("convo");
    const convo: Conversation = {
      id,
      title: "Yangi suhbat",
      messages: [],
      updatedAt: new Date().toISOString(),
      pinned: false,
    };
    setConversations((prev) => {
      const next = sortConversations([convo, ...prev]);
      saveConversations(next);
      return next;
    });
    setActiveId(id);
    setActiveConversationId(id);
    return id;
  }, [activeId]);

  const startNewChat = () => {
    const id = generateId("convo");
    const convo: Conversation = {
      id,
      title: "Yangi suhbat",
      messages: [],
      updatedAt: new Date().toISOString(),
      pinned: false,
    };
    setConversations((prev) => {
      const next = sortConversations([convo, ...prev]);
      saveConversations(next);
      return next;
    });
    setActiveId(id);
    setActiveConversationId(id);
    setMessages([]);
    setInput("");
    setImages([]);
    resetSessionId();
    setSidebarOpen(false);
    setMenuId(null);
    setEditingId(null);
    inputRef.current?.focus();
  };

  const selectConversation = (id: string) => {
    const found = conversations.find((c) => c.id === id);
    if (!found) return;
    setActiveId(id);
    setActiveConversationId(id);
    setMessages(found.messages);
    setSidebarOpen(false);
    setMenuId(null);
  };

  const renameConversation = (id: string, title: string) => {
    const clean = title.trim() || "Yangi suhbat";
    setConversations((prev) => {
      const next = sortConversations(
        prev.map((c) => (c.id === id ? { ...c, title: clean } : c))
      );
      saveConversations(next);
      return next;
    });
    setEditingId(null);
  };

  const togglePin = (id: string) => {
    setConversations((prev) => {
      const next = sortConversations(
        prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
      );
      saveConversations(next);
      return next;
    });
    setMenuId(null);
  };

  const confirmDeleteConversation = () => {
    const id = deleteConfirmId;
    if (!id) return;

    setConversations((prev) => {
      const next = sortConversations(prev.filter((c) => c.id !== id));
      saveConversations(next);
      return next;
    });

    setDeleteConfirmId(null);
    setMenuId(null);

    if (activeId === id) {
      startNewChat();
    }
  };

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1024;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.onerror = () => resolve(reader.result as string);
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleVoice = () => {
    const rec = createSpeechRecognition();
    if (!rec) {
      setInput((v) => v || "Ovozli kiritish qo'llab-quvvatlanmaydi.");
      return;
    }
    setListening(true);
    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) setInput((v) => (v ? `${v} ${transcript}` : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if ((!text && images.length === 0) || loading) return;

    const payloadText =
      text ||
      (images.length
        ? `${images.length} ta o'simlik rasmini tahlil qiling.`
        : "");

    ensureConversation();
    const imgs = [...images];
    const userMessage: ChatMessage = {
      id: generateId("msg"),
      role: "user",
      content: payloadText,
      createdAt: new Date().toISOString(),
      imageUrls: imgs.length ? imgs : undefined,
    };
    const assistantId = generateId("msg");
    const sessionId = getOrCreateSessionId();
    const crops = loadCropMemory();
    const crop = detectCropFromText(payloadText);
    const cropMemory = getCropContextBlock(crops, crop?.id);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImages([]);
    setLoading(true);

    try {
      await streamAgronomReply(
        {
          message: payloadText,
          language: "auto",
          sessionId,
          images: imgs.length ? imgs : undefined,
          cropMemory: cropMemory || undefined,
          weather: weatherPromptBlock(weather || null) || undefined,
        },
        {
          onChunk: (content) => {
            const { text: cleaned } = stripAgentMeta(content);
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === assistantId);
              const assistantMsg: ChatMessage = {
                id: assistantId,
                role: "assistant",
                content: cleaned || content,
                createdAt: new Date().toISOString(),
                isStreaming: true,
              };
              if (!exists) return [...prev, assistantMsg];
              return prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: cleaned || content, isStreaming: true }
                  : m
              );
            });
          },
          onDone: (fullAnswer) => {
            const { text: cleaned } = stripAgentMeta(fullAnswer);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: cleaned, isStreaming: false }
                  : m
              )
            );
            if (crop) upsertCropChat(crops, crop, payloadText, cleaned);
          },
          onError: (errorMsg) => {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === assistantId);
              const err: ChatMessage = {
                id: assistantId,
                role: "assistant",
                content: errorMsg,
                createdAt: new Date().toISOString(),
              };
              return exists
                ? prev.map((m) => (m.id === assistantId ? err : m))
                : [...prev, err];
            });
          },
        }
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: ERROR_MESSAGE,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  sendRef.current = send;

  useEffect(() => {
    if (!chatRef) return;
    chatRef.current = {
      focus: () => {
        document.getElementById("ai-chat")?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => inputRef.current?.focus(), 350);
      },
      startVoice: () => {
        document.getElementById("ai-chat")?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => handleVoice(), 400);
      },
      openImages: () => {
        document.getElementById("ai-chat")?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => fileRef.current?.click(), 400);
      },
      sendPrompt: (text: string) => {
        document.getElementById("ai-chat")?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => void sendRef.current(text), 400);
      },
    };
  });

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const encoded = await Promise.all(
      files.slice(0, MAX_IMAGES - images.length).map(compressImage)
    );
    setImages((prev) => [...prev, ...encoded].slice(0, MAX_IMAGES));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const hasMessages = messages.length > 0;
  const sorted = sortConversations(conversations);

  return (
    <section id="ai-chat" className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 md:pb-16">
      <div className="glass-strong relative flex min-h-[520px] overflow-hidden rounded-3xl md:min-h-[600px]">
        {/* Sidebar */}
        <aside
          className={`absolute inset-y-0 left-0 z-20 flex w-[240px] flex-col border-r border-line bg-[#0F172A]/95 backdrop-blur-xl transition-transform md:static md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-3">
            <button
              type="button"
              onClick={startNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-[#111827] px-3 py-2.5 text-sm font-medium transition hover:border-brand/30"
            >
              + New Chat
            </button>
          </div>
          <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
            {sorted.map((c) => (
              <div
                key={c.id}
                className={`group relative rounded-xl ${
                  c.id === activeId ? "bg-brand-soft" : "hover:bg-[#111827]"
                }`}
              >
                {editingId === c.id ? (
                  <input
                    ref={editInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        renameConversation(c.id, editTitle);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingId(null);
                      }
                    }}
                    onBlur={() => renameConversation(c.id, editTitle)}
                    className="w-full rounded-xl border border-brand/40 bg-[#111827] px-3 py-2.5 text-sm outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm"
                  >
                    {c.pinned && <span className="text-brand">📌</span>}
                    <span className="line-clamp-1 flex-1 font-medium">{c.title}</span>
                  </button>
                )}
                {editingId !== c.id && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas-muted hover:text-ink"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId((id) => (id === c.id ? null : c.id));
                      }}
                    >
                      ⋯
                    </button>
                    {menuId === c.id && (
                      <div
                        className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-[#111827] py-1 shadow-lift"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas-muted"
                          onClick={() => {
                            setEditTitle(c.title);
                            setEditingId(c.id);
                            setMenuId(null);
                          }}
                        >
                          <span aria-hidden>✏️</span> Edit
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas-muted"
                          onClick={() => togglePin(c.id)}
                        >
                          <span aria-hidden>📌</span>{" "}
                          {c.pinned ? "Unpin" : "Pin"}
                        </button>
                        <div className="my-1 border-t border-line" />
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#DC2626] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                          onClick={() => {
                            setDeleteConfirmId(c.id);
                            setMenuId(null);
                          }}
                        >
                          <span aria-hidden>🗑️</span> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="absolute inset-0 z-10 bg-black/40 md:hidden"
            aria-label="Yopish"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Chat pane */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-[#0B1220]/40">
          <div className="flex h-12 items-center gap-2 border-b border-line px-3 md:hidden">
            <button
              type="button"
              className="btn-ghost !px-2"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <span className="text-sm text-ink-muted">Suhbatlar</span>
          </div>

          <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {!hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-ink-muted">
                <p className="text-sm">Savolingizni yozing yoki rasm yuboring</p>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:max-w-[85%] ${
                          m.role === "user"
                            ? "bg-brand text-brand-fg"
                            : "border border-line bg-[#111827] text-ink"
                        }`}
                      >
                        {m.imageUrls?.length ? (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {m.imageUrls.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt=""
                                className="h-14 w-14 rounded-lg object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                        {m.role === "user" ? (
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        ) : (
                          <div className="markdown-platform">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content}
                            </ReactMarkdown>
                            {m.isStreaming && (
                              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brand" />
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && !messages.some((m) => m.isStreaming) && (
                  <div className="flex gap-1.5 rounded-2xl border border-line bg-[#111827] px-4 py-3 w-fit">
                    <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-ink-faint [animation-delay:-0.32s]" />
                    <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-ink-faint [animation-delay:-0.16s]" />
                    <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-ink-faint" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-line p-3 sm:p-4">
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-line bg-[#111827]/80 p-2 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/15"
            >
              {images.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 px-1">
                  {images.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 rounded-full bg-ink px-1 text-[10px] text-canvas"
                        onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Savolingizni yozing..."
                className="max-h-32 min-h-[44px] w-full resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-ink-faint"
              />
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    className="btn-ghost !px-2.5 !py-1.5 text-base"
                    title="Fayl"
                    onClick={() => fileRef.current?.click()}
                  >
                    📎
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !px-2.5 !py-1.5 text-base"
                    title="Rasm"
                    onClick={() => fileRef.current?.click()}
                  >
                    📷
                  </button>
                  <button
                    type="button"
                    className={`btn-ghost !px-2.5 !py-1.5 text-base ${listening ? "!text-brand" : ""}`}
                    title="Voice"
                    onClick={handleVoice}
                  >
                    🎤
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && images.length === 0)}
                  className="btn-primary !rounded-xl !px-3.5 !py-2 disabled:opacity-40"
                  aria-label="Send"
                >
                  ➜
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-chat-title"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-[#111827] p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-chat-title"
              className="text-lg font-semibold tracking-tight text-ink"
            >
              Delete Chat?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Bu suhbatni o&apos;chirishni xohlaysizmi?
              <br />
              Bu amalni bekor qilib bo&apos;lmaydi.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-line bg-transparent px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-canvas-muted hover:text-ink"
                onClick={() => setDeleteConfirmId(null)}
              >
                ❌ Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#B91C1C]"
                onClick={confirmDeleteConversation}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
