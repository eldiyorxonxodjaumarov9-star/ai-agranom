"use client";

import { useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/chat/types";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  onClear: () => void;
}

const WELCOME_MESSAGE =
  "Assalomu alaykum! Men Я AI Дехқонman. Ekin parvarishi, o'g'itlash, kasalliklar, zararkunandalar, sug'orish va boshqa agro masalalar bo'yicha yordam bera olaman. Savolingizni yozing!";

export default function ChatWindow({
  messages,
  isLoading,
  isStreaming,
  inputValue,
  onInputChange,
  onSend,
  onClose,
  onClear,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const displayMessages =
    messages.length === 0
      ? [
          {
            id: "welcome",
            role: "assistant" as const,
            content: WELCOME_MESSAGE,
            createdAt: new Date().toISOString(),
          },
        ]
      : messages;

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl bg-earth-50 shadow-chat-lg ring-1 ring-agro-200/60 animate-slide-up"
      role="dialog"
      aria-label="Я AI Дехқон chat"
    >
      {/* Header */}
      <header className="flex items-center justify-between bg-gradient-to-r from-agro-700 to-agro-600 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <LeafIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              Я AI Дехқон
            </h2>
            <p className="text-xs text-agro-100">Onlayn maslahatchi</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Chatni tozalash"
              title="Chatni tozalash"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Chatni yopish"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
        {displayMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && !isStreaming && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        disabled={isLoading}
      />
    </div>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66C7.5 17.5 9.5 14 17 12.5V8zM20.54 3.46C19.2 2.12 17.2 2 15.5 2.5c-1.9.6-3.5 2-4.5 3.5-1.5 2.2-2 5-1.5 7.5.5 2.5 2 4.5 4 5.5 1 .5 2 .8 3 .8 2.5 0 5-1.5 6.5-4 1-1.8 1.2-4 .5-6-.3-.8-.8-1.5-1.5-2.1.5-1.2 1.5-2.2 2.9-2.8 1-.4 2.1-.5 3.1-.2z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
    </svg>
  );
}
