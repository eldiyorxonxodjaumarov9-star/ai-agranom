export function LeafLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="10" className="fill-agro-600" />
      <path
        d="M16 7C10 9 8 14 7 22c3-2 5-4 9-5V7zm4 0v9c4 1 6 3 8 5-1-7-3-11-8-14z"
        fill="white"
        fillOpacity="0.95"
      />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

export function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 320" fill="none" aria-hidden="true">
      <ellipse cx="200" cy="290" rx="160" ry="18" fill="#15803d" fillOpacity="0.12" />
      <rect x="60" y="180" width="280" height="100" rx="20" fill="#dcfce7" />
      <rect x="80" y="200" width="80" height="60" rx="12" fill="#22c55e" fillOpacity="0.3" />
      <rect x="170" y="190" width="90" height="70" rx="12" fill="#16a34a" fillOpacity="0.25" />
      <rect x="270" y="205" width="60" height="55" rx="12" fill="#4ade80" fillOpacity="0.35" />
      <circle cx="120" cy="170" r="28" fill="#fbbf24" fillOpacity="0.9" />
      <path d="M200 120c-30 20-45 55-50 90h100c-5-35-20-70-50-90z" fill="#16a34a" />
      <path d="M200 95c-8 15-12 32-12 50 8-2 16-3 24-3s16 1 24 3c0-18-4-35-12-50z" fill="#22c55e" />
      <ellipse cx="200" cy="200" rx="55" ry="12" fill="#14532d" fillOpacity="0.15" />
      <rect x="155" y="155" width="90" height="50" rx="8" fill="#fef3c7" />
      <circle cx="175" cy="175" r="10" fill="#ef4444" fillOpacity="0.8" />
      <circle cx="200" cy="170" r="10" fill="#f97316" fillOpacity="0.8" />
      <circle cx="225" cy="175" r="10" fill="#84cc16" fillOpacity="0.9" />
      <path d="M300 140l20-30 15 20 25-35 20 45H300z" fill="#86efac" fillOpacity="0.5" />
      <circle cx="90" cy="130" r="6" fill="#fbbf24" fillOpacity="0.6" />
      <circle cx="310" cy="100" r="4" fill="#fbbf24" fillOpacity="0.5" />
    </svg>
  );
}
