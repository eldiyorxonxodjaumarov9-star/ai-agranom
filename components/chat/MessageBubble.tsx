"use client";

import type { ChatMessage } from "@/lib/chat/types";
import MarkdownMessage from "./MarkdownMessage";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[85%] gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-agro-600 text-white">
            <LeafIcon className="h-4 w-4" />
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-agro-600 text-white"
              : "rounded-tl-sm bg-white text-gray-800 shadow-sm ring-1 ring-agro-100"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MarkdownMessage content={message.content} />
          )}
          {message.isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-agro-500" />
          )}
        </div>
      </div>
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
