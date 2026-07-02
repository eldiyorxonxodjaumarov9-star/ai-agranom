"use client";

import { useState } from "react";
import {
  LeafLogo,
  SearchIcon,
  LocationIcon,
  BellIcon,
  ChevronDownIcon,
} from "./icons";

const LOCATIONS = ["Toshkent", "Samarqand", "Farg'ona", "Andijon", "Buxoro"];

export default function Header() {
  const [location, setLocation] = useState("Toshkent");
  const [showLocations, setShowLocations] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 shadow-soft backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="flex h-14 min-w-0 items-center justify-between gap-2 sm:h-16 lg:h-[72px] lg:gap-3">
          {/* Logo */}
          <a href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-2.5">
            <LeafLogo className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" />
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold text-agro-800 sm:text-lg">
                Agro Olam
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-wider text-agro-500 sm:block">
                Marketplace
              </span>
            </div>
          </a>

          {/* Desktop search */}
          <div className="hidden flex-1 px-6 lg:block lg:max-w-xl xl:max-w-2xl">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Mahsulot, xizmat yoki kategoriya qidiring..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 text-sm text-gray-800 placeholder:text-gray-400 transition-colors focus:border-agro-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-100"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {/* Location */}
            <div className="relative">
              <button
                onClick={() => setShowLocations((p) => !p)}
                className="flex items-center gap-1 rounded-xl px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:gap-1.5 sm:px-3"
                aria-expanded={showLocations}
                aria-haspopup="listbox"
              >
                <LocationIcon className="h-4 w-4 text-agro-600 sm:h-5 sm:w-5" />
                <span className="hidden max-w-[80px] truncate sm:inline md:max-w-none">
                  {location}
                </span>
                <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
              </button>

              {showLocations && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowLocations(false)}
                    aria-hidden="true"
                  />
                  <ul
                    role="listbox"
                    className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-card-lg"
                  >
                    {LOCATIONS.map((loc) => (
                      <li key={loc}>
                        <button
                          role="option"
                          aria-selected={location === loc}
                          onClick={() => {
                            setLocation(loc);
                            setShowLocations(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-agro-50 ${
                            location === loc
                              ? "font-semibold text-agro-700"
                              : "text-gray-700"
                          }`}
                        >
                          {loc}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Notifications */}
            <button
              className="relative rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-agro-700"
              aria-label="Bildirishnomalar"
            >
              <BellIcon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Auth */}
            <div className="hidden items-center gap-2 sm:flex">
              <button className="rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                Kirish
              </button>
              <button className="rounded-xl bg-gradient-to-r from-agro-600 to-agro-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:shadow-card">
                Ro&apos;yxatdan o&apos;tish
              </button>
            </div>
            <button className="rounded-lg border border-agro-200 bg-agro-50 px-2.5 py-1.5 text-[11px] font-semibold text-agro-700 transition-colors hover:bg-agro-100 sm:hidden">
              Kirish
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="pb-2.5 sm:pb-3 lg:hidden">
          <div className="relative w-full">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Mahsulot yoki xizmat qidiring..."
              className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-agro-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-agro-100"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
