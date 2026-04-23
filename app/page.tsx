"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AirportSuggestion = { iata_code: string; name: string };

type MultiCityLeg = {
  origin: string;
  destination: string;
  date: string;
  originSelected: string | null;
  destinationSelected: string | null;
};

const FONT_STACK = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "#5F5E5A",
  fontWeight: 500,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  marginBottom: 4,
};

const FIELD_CHIP_STYLE: React.CSSProperties = {
  padding: "10px 12px",
  background: "#F5F7FA",
  borderRadius: 10,
  minHeight: 44,
};

const DESTINATIONS = [
  { city: "London", origin: "DXB", destination: "LHR", price: 450, bg: "#378ADD", dark: "#1C5E9E", icon: "bigben" as const },
  { city: "Bangkok", origin: "DXB", destination: "BKK", price: 320, bg: "#EF9F27", dark: "#A96E12", icon: "temple" as const },
  { city: "Istanbul", origin: "DXB", destination: "IST", price: 280, bg: "#D4537E", dark: "#8E2F56" , icon: "mosque" as const },
  { city: "New York", origin: "LHR", destination: "JFK", price: 440, bg: "#534AB7", dark: "#352D87", icon: "skyline" as const },
  { city: "Barcelona", origin: "LHR", destination: "BCN", price: 180, bg: "#E24B4A", dark: "#9E2B2A", icon: "sagrada" as const },
  { city: "Paris", origin: "DXB", destination: "CDG", price: 520, bg: "#1D9E75", dark: "#106A4E", icon: "eiffel" as const },
  { city: "Dubai", origin: "LHR", destination: "DXB", price: 480, bg: "#F09595", dark: "#B2595A", icon: "burj" as const },
  { city: "London", origin: "BKK", destination: "LHR", price: 380, bg: "#7F77DD", dark: "#4E45A8", icon: "bigben-moon" as const },
];

type DestinationIcon = (typeof DESTINATIONS)[number]["icon"];

function deriveCity(fullName: string): string {
  if (!fullName) return "";
  const cleaned = fullName.replace(/ International Airport| Intl Airport| Airport| International/i, "").split(",")[0].trim();
  return cleaned || fullName;
}

function formatLongDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const d1 = new Date(`${a}T00:00:00`);
  const d2 = new Date(`${b}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

function PlaneIcon({ color = "#1E5FFF", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  );
}

function PinIcon({ color = "#1E5FFF", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12z"/>
      <circle cx="12" cy="10" r="2.5"/>
    </svg>
  );
}

function DestinationArt({ icon, dark }: { icon: DestinationIcon; dark: string }) {
  switch (icon) {
    case "bigben":
      return (
        <svg viewBox="0 0 160 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <rect x="70" y="20" width="20" height="75" fill={dark} />
          <rect x="66" y="18" width="28" height="6" fill={dark} />
          <circle cx="80" cy="35" r="5" fill="#F5F7FA" />
          <rect x="77" y="10" width="6" height="10" fill={dark} />
        </svg>
      );
    case "temple":
      return (
        <svg viewBox="0 0 160 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <polygon points="80,25 50,85 110,85" fill={dark} />
          <polygon points="80,40 60,85 100,85" fill={dark} opacity="0.85" />
          <rect x="78" y="14" width="4" height="12" fill={dark} />
          <polygon points="80,8 76,16 84,16" fill={dark} />
        </svg>
      );
    case "mosque":
      return (
        <svg viewBox="0 0 160 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <rect x="50" y="55" width="60" height="35" fill={dark} />
          <ellipse cx="80" cy="55" rx="20" ry="22" fill={dark} />
          <rect x="78" y="22" width="4" height="12" fill={dark} />
          <rect x="36" y="40" width="6" height="50" fill={dark} />
          <rect x="118" y="40" width="6" height="50" fill={dark} />
          <path d="M36 40 l3 -8 l3 8" fill={dark} />
          <path d="M118 40 l3 -8 l3 8" fill={dark} />
        </svg>
      );
    case "skyline":
      return (
        <svg viewBox="0 0 160 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <rect x="40" y="45" width="20" height="50" fill={dark} />
          <rect x="62" y="25" width="22" height="70" fill={dark} />
          <rect x="86" y="55" width="18" height="40" fill={dark} />
          <rect x="106" y="35" width="20" height="60" fill={dark} />
          <rect x="70" y="15" width="6" height="12" fill={dark} />
        </svg>
      );
    case "sagrada":
      return (
        <svg viewBox="0 0 160 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <polygon points="80,10 70,95 90,95" fill={dark} />
          <polygon points="62,30 54,95 70,95" fill={dark} opacity="0.85" />
          <polygon points="98,30 90,95 106,95" fill={dark} opacity="0.85" />
          <circle cx="60" cy="58" r="3" fill="#F5F7FA" />
          <circle cx="100" cy="58" r="3" fill="#F5F7FA" />
          <circle cx="80" cy="48" r="4" fill="#F5F7FA" />
        </svg>
      );
    case "eiffel":
      return (
        <svg viewBox="0 0 160 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <polygon points="80,12 68,95 92,95" fill={dark} />
          <polygon points="80,12 74,50 86,50" fill={dark} opacity="0.4" />
          <rect x="70" y="55" width="20" height="3" fill={dark} />
          <rect x="66" y="78" width="28" height="3" fill={dark} />
          <rect x="78" y="6" width="4" height="10" fill={dark} />
          <rect x="76" y="2" width="8" height="4" fill={dark} />
        </svg>
      );
    case "burj":
      return (
        <svg viewBox="0 0 160 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <polygon points="80,5 72,95 88,95" fill={dark} />
          <rect x="70" y="35" width="20" height="2" fill={dark} opacity="0.6" />
          <rect x="70" y="55" width="20" height="2" fill={dark} opacity="0.6" />
          <rect x="70" y="75" width="20" height="2" fill={dark} opacity="0.6" />
        </svg>
      );
    case "bigben-moon":
      return (
        <svg viewBox="0 0 160 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <circle cx="130" cy="25" r="10" fill="#F7C95B" />
          <rect x="70" y="20" width="20" height="75" fill={dark} />
          <rect x="66" y="18" width="28" height="6" fill={dark} />
          <circle cx="80" cy="35" r="5" fill="#F5F7FA" />
          <rect x="77" y="10" width="6" height="10" fill={dark} />
        </svg>
      );
    default:
      return null;
  }
}

export default function HomePage() {
  const [tripType, setTripType] = useState<"oneway" | "roundtrip" | "multicity">("oneway");
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<AirportSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<AirportSuggestion[]>([]);
  const [originSelected, setOriginSelected] = useState<string | null>(null);
  const [destinationSelected, setDestinationSelected] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabinClass, setCabinClass] = useState("economy");
  const [showPaxDropdown, setShowPaxDropdown] = useState(false);
  const [multiCityLegs, setMultiCityLegs] = useState<MultiCityLeg[]>([
    { origin: "", destination: "", date: "", originSelected: null, destinationSelected: null },
    { origin: "", destination: "", date: "", originSelected: null, destinationSelected: null },
  ]);
  const router = useRouter();

  const [multiCityOriginSuggestions, setMultiCityOriginSuggestions] = useState<AirportSuggestion[][]>([[], []]);
  const [multiCityDestinationSuggestions, setMultiCityDestinationSuggestions] = useState<AirportSuggestion[][]>([[], []]);
  const paxDropdownRef = useRef<HTMLDivElement>(null);

  const totalPassengers = adults + children + infants;

  const searchAirports = async (
    query: string,
    setSuggestions: (suggestions: AirportSuggestion[]) => void,
  ) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://trvlscan-backend-production.up.railway.app/api/flights/airports?query=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSearch = () => {
    if (tripType === "multicity") {
      const validLegs = multiCityLegs.filter((l) => l.originSelected && l.destinationSelected && l.date);
      if (validLegs.length < 2) {
        alert("Please fill at least 2 flight legs");
        return;
      }
      sessionStorage.setItem(
        "searchParams",
        JSON.stringify({ tripType: "multicity", legs: validLegs, passengers: totalPassengers, cabinClass }),
      );
    } else {
      const resolvedOrigin =
        originSelected ?? (tripType === "roundtrip" && originQuery.trim().length >= 3 ? originQuery.trim().toUpperCase() : null);
      const resolvedDestination =
        destinationSelected ??
        (tripType === "roundtrip" && destinationQuery.trim().length >= 3 ? destinationQuery.trim().toUpperCase() : null);

      if (!resolvedOrigin || !resolvedDestination) {
        alert("Please select airports from the dropdown");
        return;
      }
      if (!date) {
        alert("Please select a departure date");
        return;
      }
      if (tripType === "roundtrip" && !returnDate) {
        alert("Please select a return date");
        return;
      }
      sessionStorage.setItem(
        "searchParams",
        JSON.stringify({
          tripType,
          origin: resolvedOrigin,
          destination: resolvedDestination,
          departure_date: date,
          returnDate,
          passengers: totalPassengers,
          cabinClass,
        }),
      );
    }
    router.push("/results");
  };

  const ensureMultiCitySuggestionSlots = (nextLegCount: number) => {
    setMultiCityOriginSuggestions((prev) => {
      if (prev.length >= nextLegCount) return prev;
      return [...prev, ...Array.from({ length: nextLegCount - prev.length }, () => [])];
    });
    setMultiCityDestinationSuggestions((prev) => {
      if (prev.length >= nextLegCount) return prev;
      return [...prev, ...Array.from({ length: nextLegCount - prev.length }, () => [])];
    });
  };

  const multiCityRows = useMemo(() => multiCityLegs.slice(0, 5), [multiCityLegs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paxDropdownRef.current && !paxDropdownRef.current.contains(event.target as Node)) {
        setShowPaxDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const cabinClassLabel =
    cabinClass === "economy"
      ? "Economy"
      : cabinClass === "premium_economy"
        ? "Premium Economy"
        : cabinClass === "business"
          ? "Business"
          : "First";

  const handleDestinationClick = (origin: string, destination: string) => {
    const target = new Date();
    target.setDate(target.getDate() + 14);
    const yyyymmdd = target.toISOString().slice(0, 10);
    sessionStorage.setItem(
      "searchParams",
      JSON.stringify({
        tripType: "oneway",
        origin,
        destination,
        departure_date: yyyymmdd,
        returnDate: "",
        passengers: 1,
        cabinClass: "economy",
      }),
    );
    router.push("/results");
  };

  const swapOriginDestination = () => {
    const nextOriginQuery = destinationQuery;
    const nextDestinationQuery = originQuery;
    const nextOriginSelected = destinationSelected;
    const nextDestinationSelected = originSelected;
    setOriginQuery(nextOriginQuery);
    setDestinationQuery(nextDestinationQuery);
    setOriginSelected(nextOriginSelected);
    setDestinationSelected(nextDestinationSelected);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
  };

  const tabs: { key: typeof tripType; label: string }[] = [
    { key: "oneway", label: "One Way" },
    { key: "roundtrip", label: "Round Trip" },
    { key: "multicity", label: "Multi City" },
  ];

  const renderAirportField = (
    label: string,
    icon: React.ReactNode,
    query: string,
    selected: string | null,
    suggestions: AirportSuggestion[],
    onChange: (value: string) => void,
    onPick: (s: AirportSuggestion) => void,
    placeholder: string,
  ) => (
    <div>
      <div style={FIELD_LABEL_STYLE}>{label}</div>
      <div className="relative">
        <div style={FIELD_CHIP_STYLE} className="flex items-center gap-[10px]">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={query}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              className="w-full bg-transparent border-0 outline-none p-0 text-[14px] font-medium text-[#0B1F3A] placeholder:text-[#888780] placeholder:font-normal"
              style={{ fontFamily: FONT_STACK }}
            />
            {selected && (
              <div className="text-[11px] text-[#888780] truncate mt-[1px]">
                {selected} · {query}
              </div>
            )}
          </div>
        </div>
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[220px] overflow-y-auto rounded-xl bg-white shadow-lg border-[0.5px] border-[rgba(11,31,58,0.08)]">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.iata_code}-${suggestion.name}`}
                type="button"
                onClick={() => onPick(suggestion)}
                className="w-full text-left px-3 py-2.5 text-[13px] text-[#0B1F3A] hover:bg-[#F5F7FA]"
              >
                <span className="font-medium">{suggestion.iata_code}</span>
                <span className="text-[#888780]"> — {suggestion.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDateChip = (label: string, value: string, onChange: (v: string) => void, highlight = false) => (
    <div>
      <div style={{ ...FIELD_LABEL_STYLE, color: highlight ? "#1E5FFF" : FIELD_LABEL_STYLE.color }}>{label}</div>
      <div
        className="relative"
        style={{
          ...FIELD_CHIP_STYLE,
          background: highlight ? "#E6F1FB" : FIELD_CHIP_STYLE.background,
          border: highlight ? "0.5px solid #85B7EB" : "0.5px solid transparent",
        }}
      >
        <div
          className="text-[14px] font-medium pointer-events-none"
          style={{ color: highlight ? "#185FA5" : "#0B1F3A" }}
        >
          {value ? formatLongDate(value) : <span className="text-[#888780] font-normal">Select date</span>}
        </div>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );

  const renderPassengersChip = (compactLabel = false) => (
    <div>
      <div style={FIELD_LABEL_STYLE}>PASSENGERS</div>
      <div className="relative" ref={compactLabel ? undefined : paxDropdownRef}>
        <button
          type="button"
          onClick={() => setShowPaxDropdown((v) => !v)}
          className="w-full text-left"
          style={{ ...FIELD_CHIP_STYLE, border: "0.5px solid transparent" }}
        >
          <div className="text-[14px] font-medium text-[#0B1F3A]">
            {totalPassengers} · {cabinClassLabel}
          </div>
        </button>
        {showPaxDropdown && (
          <div
            ref={compactLabel ? paxDropdownRef : undefined}
            className="absolute top-full right-0 z-50 mt-2 w-72 bg-white rounded-2xl shadow-xl border-[0.5px] border-[rgba(11,31,58,0.08)] p-4"
          >
            {[
              { label: "Adults", sub: "Age 12+", value: adults, set: setAdults, min: 1 },
              { label: "Children", sub: "Age 2-11", value: children, set: setChildren, min: 0 },
              { label: "Infants", sub: "Age 0-1", value: infants, set: setInfants, min: 0 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[rgba(11,31,58,0.08)]">
                <div>
                  <div className="text-[13px] font-medium text-[#0B1F3A]">{row.label}</div>
                  <div className="text-[11px] text-[#888780]">{row.sub}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => row.set(Math.max(row.min, row.value - 1))}
                    className="w-7 h-7 rounded-full border-[0.5px] border-[rgba(11,31,58,0.16)] text-[#1E5FFF] font-medium"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-[13px] font-medium text-[#0B1F3A]">{row.value}</span>
                  <button
                    type="button"
                    onClick={() => row.set(Math.min(9, row.value + 1))}
                    className="w-7 h-7 rounded-full border-[0.5px] border-[rgba(11,31,58,0.16)] text-[#1E5FFF] font-medium"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-3">
              <div className="text-[10px] font-medium tracking-[1px] uppercase text-[#888780] mb-2">Cabin class</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: "economy", label: "Economy" },
                  { value: "premium_economy", label: "Premium" },
                  { value: "business", label: "Business" },
                  { value: "first", label: "First" },
                ].map((cls) => (
                  <button
                    key={cls.value}
                    type="button"
                    onClick={() => setCabinClass(cls.value)}
                    className="py-1.5 px-2 rounded-lg text-[12px] font-medium border-[0.5px] transition-colors"
                    style={{
                      background: cabinClass === cls.value ? "#1E5FFF" : "#F5F7FA",
                      color: cabinClass === cls.value ? "#FFFFFF" : "#0B1F3A",
                      borderColor: cabinClass === cls.value ? "#1E5FFF" : "rgba(11,31,58,0.08)",
                    }}
                  >
                    {cls.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPaxDropdown(false)}
              className="w-full mt-4 py-2 bg-[#1E5FFF] text-white rounded-full text-[13px] font-medium"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const buttonLabel =
    tripType === "oneway"
      ? "Search flights"
      : tripType === "roundtrip"
        ? "Search round trip"
        : `Search ${multiCityLegs.length} flights`;

  return (
    <main style={{ fontFamily: FONT_STACK, background: "#F5F7FA", minHeight: "100vh", color: "#0B1F3A" }}>
      {/* NAVBAR */}
      <nav
        className="fixed z-50 flex items-center justify-between"
        style={{
          top: 12,
          left: 12,
          right: 12,
          background: "#FFFFFF",
          borderRadius: 12,
          border: "0.5px solid rgba(11,31,58,0.08)",
          padding: "12px 20px",
        }}
      >
        <div className="flex items-center" style={{ gap: 32 }}>
          <span style={{ fontSize: 18, fontWeight: 500, color: "#0B1F3A", letterSpacing: "-0.3px" }}>TRVLscan</span>
          <a
            href="#"
            style={{
              color: "#1E5FFF",
              fontWeight: 500,
              fontSize: 14,
              paddingBottom: 2,
              borderBottom: "2px solid #1E5FFF",
            }}
          >
            Flights
          </a>
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          <div
            className="flex items-center"
            style={{
              background: "#E8F7EE",
              color: "#0F6E56",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 12,
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "#1D9E75" }} />
            <span className="hidden sm:inline">USDT · TRC-20</span>
            <span className="sm:hidden">USDT</span>
          </div>
          <div
            className="flex items-center justify-center"
            style={{ width: 32, height: 32, borderRadius: 999, background: "#F1EFE8" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B1F3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
          </div>
        </div>
      </nav>

      {/* CONTENT CONTAINER */}
      <div style={{ paddingTop: 80, paddingBottom: 40 }}>
        <div className="max-w-[1440px] mx-auto" style={{ padding: "0 12px" }}>
          {/* SPLIT VIEW */}
          <section className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>
            {/* LEFT — SEARCH FORM */}
            <div
              className="sm:p-5"
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                border: "0.5px solid rgba(11,31,58,0.08)",
                padding: 16,
                minHeight: 360,
              }}
            >
              {/* TAB BAR */}
              <div
                className="flex"
                style={{ background: "#F5F7FA", borderRadius: 10, padding: 4, marginBottom: 16 }}
              >
                {tabs.map((t) => {
                  const active = tripType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTripType(t.key)}
                      className="flex-1"
                      style={{
                        background: active ? "#FFFFFF" : "transparent",
                        color: active ? "#0B1F3A" : "#5F5E5A",
                        fontWeight: 500,
                        fontSize: 13,
                        padding: "8px 0",
                        borderRadius: 8,
                        border: active ? "0.5px solid rgba(11,31,58,0.08)" : "0.5px solid transparent",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* FIELDS */}
              {(tripType === "oneway" || tripType === "roundtrip") && (
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {renderAirportField(
                    "FROM",
                    <PlaneIcon />,
                    originQuery,
                    originSelected,
                    originSuggestions,
                    (value) => {
                      setOriginQuery(value);
                      setOriginSelected(null);
                      searchAirports(value, setOriginSuggestions);
                    },
                    (s) => {
                      setOriginQuery(deriveCity(s.name));
                      setOriginSelected(s.iata_code);
                      setOriginSuggestions([]);
                    },
                    "Select departure city",
                  )}

                  <div className="flex justify-end" style={{ marginTop: -4, marginBottom: -4 }}>
                    <button
                      type="button"
                      onClick={swapOriginDestination}
                      className="flex items-center justify-center"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: "#F5F7FA",
                        color: "#1E5FFF",
                        border: "0.5px solid rgba(11,31,58,0.08)",
                      }}
                      aria-label="Swap origin and destination"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 10h14l-4-4" />
                        <path d="M17 14H3l4 4" />
                      </svg>
                    </button>
                  </div>

                  {renderAirportField(
                    "TO",
                    <PinIcon />,
                    destinationQuery,
                    destinationSelected,
                    destinationSuggestions,
                    (value) => {
                      setDestinationQuery(value);
                      setDestinationSelected(null);
                      searchAirports(value, setDestinationSuggestions);
                    },
                    (s) => {
                      setDestinationQuery(deriveCity(s.name));
                      setDestinationSelected(s.iata_code);
                      setDestinationSuggestions([]);
                    },
                    "Select arrival city",
                  )}

                  {tripType === "oneway" ? (
                    <div className="grid grid-cols-2" style={{ gap: 10 }}>
                      {renderDateChip("DATE", date, setDate)}
                      {renderPassengersChip()}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2" style={{ gap: 10 }}>
                        {renderDateChip("DEPART", date, setDate)}
                        {renderDateChip("RETURN", returnDate, setReturnDate, true)}
                      </div>
                      <div
                        className="flex items-center"
                        style={{
                          background: "#EEEDFE",
                          padding: "8px 12px",
                          borderRadius: 8,
                          gap: 8,
                          marginBottom: 2,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12h18" />
                          <path d="M15 6l6 6-6 6" />
                          <path d="M9 18l-6-6 6-6" />
                        </svg>
                        <span style={{ fontSize: 11, color: "#3C3489", fontWeight: 500 }}>
                          {nightsBetween(date, returnDate)} nights · Return trip · Often 30% cheaper than 2 one-ways
                        </span>
                      </div>
                      {renderPassengersChip()}
                    </>
                  )}
                </div>
              )}

              {tripType === "multicity" && (
                <div className="flex flex-col" style={{ gap: 10 }}>
                  {multiCityRows.map((leg, idx) => (
                    <div key={idx} className="flex items-end" style={{ gap: 10 }}>
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: "#1E5FFF",
                          color: "#FFFFFF",
                          fontSize: 11,
                          fontWeight: 500,
                          marginBottom: 6,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div
                        className="flex-1"
                        style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}
                      >
                        {/* FROM */}
                        <div className="relative">
                          <div style={{ ...FIELD_CHIP_STYLE, padding: "8px 10px", borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: "#888780" }}>FROM</div>
                            <input
                              type="text"
                              value={leg.originSelected ?? leg.origin}
                              placeholder="DXB"
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                setMultiCityLegs((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, origin: value, originSelected: null } : l)),
                                );
                                searchAirports(value, (suggestions) => {
                                  setMultiCityOriginSuggestions((prev) => prev.map((arr, i) => (i === idx ? suggestions : arr)));
                                });
                              }}
                              className="w-full bg-transparent border-0 outline-none p-0 text-[13px] font-medium text-[#0B1F3A] uppercase placeholder:text-[#888780] placeholder:font-normal"
                              style={{ fontFamily: FONT_STACK }}
                            />
                          </div>
                          {(multiCityOriginSuggestions[idx] ?? []).length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[200px] overflow-y-auto rounded-xl bg-white shadow-lg border-[0.5px] border-[rgba(11,31,58,0.08)]">
                              {(multiCityOriginSuggestions[idx] ?? []).map((s) => (
                                <button
                                  key={`mcO-${idx}-${s.iata_code}-${s.name}`}
                                  type="button"
                                  onClick={() => {
                                    setMultiCityLegs((prev) =>
                                      prev.map((l, i) => (i === idx ? { ...l, origin: s.iata_code, originSelected: s.iata_code } : l)),
                                    );
                                    setMultiCityOriginSuggestions((prev) => prev.map((arr, i) => (i === idx ? [] : arr)));
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-[13px] text-[#0B1F3A] hover:bg-[#F5F7FA]"
                                >
                                  <span className="font-medium">{s.iata_code}</span>
                                  <span className="text-[#888780]"> — {s.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* TO */}
                        <div className="relative">
                          <div style={{ ...FIELD_CHIP_STYLE, padding: "8px 10px", borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: "#888780" }}>TO</div>
                            <input
                              type="text"
                              value={leg.destinationSelected ?? leg.destination}
                              placeholder="LHR"
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                setMultiCityLegs((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, destination: value, destinationSelected: null } : l)),
                                );
                                searchAirports(value, (suggestions) => {
                                  setMultiCityDestinationSuggestions((prev) => prev.map((arr, i) => (i === idx ? suggestions : arr)));
                                });
                              }}
                              className="w-full bg-transparent border-0 outline-none p-0 text-[13px] font-medium text-[#0B1F3A] uppercase placeholder:text-[#888780] placeholder:font-normal"
                              style={{ fontFamily: FONT_STACK }}
                            />
                          </div>
                          {(multiCityDestinationSuggestions[idx] ?? []).length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[200px] overflow-y-auto rounded-xl bg-white shadow-lg border-[0.5px] border-[rgba(11,31,58,0.08)]">
                              {(multiCityDestinationSuggestions[idx] ?? []).map((s) => (
                                <button
                                  key={`mcD-${idx}-${s.iata_code}-${s.name}`}
                                  type="button"
                                  onClick={() => {
                                    setMultiCityLegs((prev) =>
                                      prev.map((l, i) => (i === idx ? { ...l, destination: s.iata_code, destinationSelected: s.iata_code } : l)),
                                    );
                                    setMultiCityDestinationSuggestions((prev) => prev.map((arr, i) => (i === idx ? [] : arr)));
                                  }}
                                  className="w-full text-left px-3 py-2.5 text-[13px] text-[#0B1F3A] hover:bg-[#F5F7FA]"
                                >
                                  <span className="font-medium">{s.iata_code}</span>
                                  <span className="text-[#888780]"> — {s.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* DATE */}
                        <div className="relative">
                          <div
                            className="relative"
                            style={{ ...FIELD_CHIP_STYLE, padding: "8px 10px", borderRadius: 8, textAlign: "center", whiteSpace: "nowrap", minWidth: 72 }}
                          >
                            <div style={{ fontSize: 10, color: "#888780" }}>DATE</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#0B1F3A" }}>
                              {leg.date ? formatShortDate(leg.date) : <span style={{ color: "#888780", fontWeight: 400 }}>Pick</span>}
                            </div>
                            <input
                              type="date"
                              value={leg.date}
                              onChange={(e) => {
                                const value = e.target.value;
                                setMultiCityLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, date: value } : l)));
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                          {idx >= 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setMultiCityLegs((prev) => prev.filter((_, i) => i !== idx));
                                setMultiCityOriginSuggestions((prev) => prev.filter((_, i) => i !== idx));
                                setMultiCityDestinationSuggestions((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute flex items-center justify-center"
                              style={{
                                top: -6,
                                right: -6,
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                background: "#FCEBEB",
                                border: "0.5px solid #F09595",
                              }}
                              aria-label="Remove flight"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A32D2D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={multiCityLegs.length >= 5}
                    onClick={() => {
                      setMultiCityLegs((prev) => {
                        const next = [
                          ...prev,
                          { origin: "", destination: "", date: "", originSelected: null, destinationSelected: null },
                        ];
                        ensureMultiCitySuggestionSlots(next.length);
                        return next;
                      });
                    }}
                    className="flex items-center justify-center"
                    style={{
                      width: "100%",
                      padding: 8,
                      background: "transparent",
                      border: "1px dashed #1E5FFF",
                      color: "#1E5FFF",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      gap: 6,
                      opacity: multiCityLegs.length >= 5 ? 0.5 : 1,
                      cursor: multiCityLegs.length >= 5 ? "not-allowed" : "pointer",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add another flight
                  </button>

                  {renderPassengersChip()}
                </div>
              )}

              {/* ACTION BUTTON */}
              <button
                type="button"
                onClick={handleSearch}
                className="flex items-center justify-center w-full transition-colors"
                style={{
                  marginTop: 16,
                  padding: "13px 0",
                  background: "#1E5FFF",
                  color: "#FFFFFF",
                  borderRadius: 24,
                  fontSize: 15,
                  fontWeight: 500,
                  gap: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1754E8")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1E5FFF")}
              >
                <PlaneIcon color="#FFFFFF" size={16} />
                {buttonLabel}
              </button>
            </div>

            {/* RIGHT — HERO */}
            <div
              className="relative overflow-hidden flex flex-col justify-between text-white"
              style={{
                borderRadius: 16,
                background: "linear-gradient(135deg, #0B1F3A 0%, #1a3a6b 100%)",
                padding: 24,
                minHeight: 360,
              }}
            >
              {/* top-right pill */}
              <div
                className="absolute flex items-center"
                style={{
                  top: 16,
                  right: 16,
                  background: "rgba(29,158,117,0.25)",
                  color: "#9FE1CB",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  gap: 6,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "#1D9E75" }} />
                USDT · TRC-20
              </div>

              {/* top block */}
              <div>
                <h1
                  className="text-[24px] sm:text-[28px] lg:text-[32px]"
                  style={{ lineHeight: 1.05, fontWeight: 500, letterSpacing: "-1px" }}
                >
                  Fly anywhere.
                  <br />
                  Pay in <span style={{ color: "#85B7EB" }}>crypto</span>
                  <span style={{ color: "#FFFFFF" }}>.</span>
                </h1>
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: "#B5D4F4",
                    lineHeight: 1.5,
                    maxWidth: 300,
                  }}
                >
                  Access global aviation networks and pay instantly with USDT on the world&apos;s most secure travel rails.
                </p>
              </div>

              {/* bottom block */}
              <div className="flex items-end" style={{ gap: 16, marginTop: 16 }}>
                <div
                  className="flex-1"
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 12,
                    padding: "12px 14px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        fontSize: 10,
                        color: "#888780",
                        fontWeight: 500,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      Verified USDT Payment
                    </span>
                    <span
                      className="flex items-center justify-center"
                      style={{ width: 16, height: 16, borderRadius: 999, background: "#1D9E75" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 500, color: "#0B1F3A" }}>
                    4,281.00 <span style={{ fontSize: 11, fontWeight: 400, color: "#888780" }}>USDT</span>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      height: 3,
                      background: "#EAF3DE",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ width: "85%", height: "100%", background: "#639922" }} />
                  </div>
                </div>

                <div style={{ flexShrink: 0, opacity: 0.9 }}>
                  <svg width="90" height="60" viewBox="0 0 90 60" fill="none">
                    <path
                      d="M10 32 L36 28 L50 10 L58 10 L52 30 L72 26 L80 18 L86 20 L78 34 L90 38 L78 44 L70 42 L52 48 L58 58 L50 58 L36 44 L10 44 Z"
                      fill="rgba(255,255,255,0.3)"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* POPULAR DESTINATIONS */}
          <section style={{ marginTop: 40 }}>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 10,
                  color: "#1E5FFF",
                  letterSpacing: 1.5,
                  fontWeight: 500,
                  marginBottom: 4,
                  textTransform: "uppercase",
                }}
              >
                Trending Routes
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0B1F3A", letterSpacing: "-0.4px", marginBottom: 2 }}>
                Popular destinations this week
              </h2>
              <p style={{ fontSize: 13, color: "#5F5E5A" }}>
                Real-time prices in USDT, live from our partners
              </p>
            </div>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              style={{ gap: 10 }}
            >
              {DESTINATIONS.map((d, i) => (
                <button
                  key={`${d.origin}-${d.destination}-${i}`}
                  type="button"
                  onClick={() => handleDestinationClick(d.origin, d.destination)}
                  className="text-left transition-transform hover:-translate-y-0.5"
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 12,
                    border: "0.5px solid rgba(11,31,58,0.08)",
                    overflow: "hidden",
                    cursor: "pointer",
                    transitionDuration: "150ms",
                    transitionTimingFunction: "ease",
                  }}
                >
                  <div
                    className="relative"
                    style={{ height: 100, background: d.bg }}
                  >
                    <DestinationArt icon={d.icon} dark={d.dark} />
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#0B1F3A" }}>{d.city}</div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 1 }}>
                      {d.origin} → {d.destination}
                    </div>
                    <div
                      className="flex items-baseline"
                      style={{ gap: 4, marginTop: 6 }}
                    >
                      <span style={{ fontSize: 10, color: "#888780" }}>from</span>
                      <span style={{ fontSize: 15, fontWeight: 500, color: "#1E5FFF" }}>{d.price} USDT</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div
            style={{
              marginTop: 48,
              paddingTop: 24,
              paddingBottom: 12,
              borderTop: "0.5px solid rgba(11,31,58,0.08)",
              fontSize: 12,
              color: "#888780",
              textAlign: "center",
            }}
          >
            © 2026 TRVLscan. Pay in crypto, fly anywhere.
          </div>
        </div>
      </div>
    </main>
  );
}
