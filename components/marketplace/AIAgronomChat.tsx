"use client";

import { useState, useEffect, useCallback } from "react";
import { useChat } from "@/lib/context/ChatContext";
import type { ChatMessage } from "@/lib/chat/types";
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  getOrCreateSessionId,
  resetSessionId,
  generateMessageId,
} from "@/lib/chat/storage";
import { streamAgronomReply } from "@/lib/api/agronom";
import ChatWindow from "@/components/chat/ChatWindow";
import { useT } from "@/lib/context/LocaleContext";

const ERROR_MESSAGE =
  "Kechirasiz, hozir javob berishda muammo bo'ldi. Iltimos, qayta urinib ko'ring.";

interface AIAgronomChatProps {
  showFloatingButton?: boolean;
}

export default function AIAgronomChat({
  showFloatingButton = true,
}: AIAgronomChatProps) {
  const { isOpen, toggleChat, closeChat } = useChat();
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setMessages(loadChatHistory());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      saveChatHistory(messages.filter((m) => !m.isStreaming));
    }
  }, [messages, isHydrated]);

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const assistantId = generateMessageId();
    const sessionId = getOrCreateSessionId();

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setIsStreaming(false);

    try {
      await streamAgronomReply(
        { message: text, language: "auto", sessionId },
        {
        onChunk: (content) => {
          setIsStreaming(true);
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === assistantId);
            const assistantMsg: ChatMessage = {
              id: assistantId,
              role: "assistant",
              content,
              createdAt: new Date().toISOString(),
              isStreaming: true,
            };

            if (!exists) {
              return [...prev, assistantMsg];
            }

            return prev.map((m) =>
              m.id === assistantId ? { ...m, content, isStreaming: true } : m
            );
          });
        },
        onDone: (fullAnswer) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullAnswer, isStreaming: false }
                : m
            )
          );
        },
        onError: (errorMsg) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === assistantId);
            const errorMessage: ChatMessage = {
              id: assistantId,
              role: "assistant",
              content: errorMsg,
              createdAt: new Date().toISOString(),
            };
            if (exists) {
              return prev.map((m) =>
                m.id === assistantId ? errorMessage : m
              );
            }
            return [...prev, errorMessage];
          });
        },
      }
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId(),
          role: "assistant",
          content: ERROR_MESSAGE,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [inputValue, isLoading]);

  const handleClear = useCallback(() => {
    setMessages([]);
    clearChatHistory();
    resetSessionId();
  }, []);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] z-[60] mx-auto h-[min(520px,calc(100dvh-8.5rem-env(safe-area-inset-bottom,0px)))] max-w-[400px] md:inset-x-auto md:bottom-24 md:right-6 md:left-auto md:h-[min(600px,calc(100vh-7rem))]">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            isStreaming={isStreaming}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={sendMessage}
            onClose={closeChat}
            onClear={handleClear}
          />
        </div>
      )}

      {showFloatingButton && (
        <button
          onClick={toggleChat}
          className={`fixed bottom-20 right-4 z-50 hidden h-14 w-14 items-center justify-center rounded-full shadow-chat-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-agro-300 md:bottom-6 md:right-6 md:flex md:h-16 md:w-16 ${
            isOpen
              ? "bg-gray-600 hover:bg-gray-700"
              : "bg-gradient-to-br from-agro-500 to-agro-700 hover:from-agro-600 hover:to-agro-800"
          }`}
          aria-label={
            isOpen
              ? "Chatni yopish"
              : t.marketplace.talkAria
          }
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <CloseIcon className="h-6 w-6 text-white" />
          ) : (
            <ChatIcon className="h-7 w-7 text-white" />
          )}

          {!isOpen && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-agro-300 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-agro-400" />
            </span>
          )}
        </button>
      )}
    </>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
