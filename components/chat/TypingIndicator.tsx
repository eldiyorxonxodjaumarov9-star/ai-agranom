"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 animate-fade-in">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-agro-600 text-white">
        <LeafIcon className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-agro-100">
        <div className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full bg-agro-400 animate-bounce-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-2 w-2 rounded-full bg-agro-400 animate-bounce-dot"
            style={{ animationDelay: "160ms" }}
          />
          <span
            className="h-2 w-2 rounded-full bg-agro-400 animate-bounce-dot"
            style={{ animationDelay: "320ms" }}
          />
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
