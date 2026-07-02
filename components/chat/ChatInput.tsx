"use client";

import { useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Savolingizni yozing...",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!value.trim() || disabled) return;
      onSend();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-agro-100 bg-white p-3"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-agro-200 bg-earth-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-agro-400 focus:outline-none focus:ring-2 focus:ring-agro-200 disabled:opacity-50"
          aria-label="Xabar yozish"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-agro-600 text-white transition-colors hover:bg-agro-700 focus:outline-none focus:ring-2 focus:ring-agro-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Yuborish"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-gray-400">
        Enter — yuborish · Shift+Enter — yangi qator
      </p>
    </form>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}
