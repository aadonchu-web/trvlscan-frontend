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
const BODY_STACK = "'Inter', system-ui, sans-serif";

const COLOR = {
  trvlBlue: "#1B4FFF",
  trvlBlueDark: "#0033C1",
  trvlBlueLight: "#4F7BFF",
  trvlBlue50: "#EEF2FF",
  trvlBlue100: "#DDE5FF",
  navy: "#0A1B3D",
  navySoft: "#1A2B4D",
  usdtGreen: "#0FA958",
  usdtGreenLight: "#E6F7EE",
  usdtGreenDark: "#087A3F",
  surface: "#F7F7F8",
  surface2: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#F0F1F3",
  muted: "#6B7280",
  mutedSoft: "#9CA3AF",
  warning: "#D97706",
  warningBg: "#FEF3C7",
};

const NAVY_SHADOW_SM = "0 2px 12px rgba(10, 27, 61, 0.05)";
const NAVY_SHADOW_LG = "0 12px 40px rgba(10, 27, 61, 0.08)";

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: COLOR.muted,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 6,
  fontFamily: BODY_STACK,
};

const FIELD_CHIP_STYLE: React.CSSProperties = {
  padding: "12px 14px",
  background: COLOR.surface,
  borderRadius: 12,
  minHeight: 52,
  border: `1px solid ${COLOR.border}`,
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

const FAQS: { q: string; a: string }[] = [
  {
    q: "Which crypto can I pay with?",
    a: "Today we accept USDT on the Tron network (TRC-20). Support for USDC, BTC, ETH and BNB is on the way — once live, you'll pick your stablecoin at checkout.",
  },
  {
    q: "How long does payment take?",
    a: "USDT on Tron usually confirms in under a minute. As soon as the payment lands, we issue your e-ticket — most bookings are done end-to-end in under five minutes.",
  },
  {
    q: "Do I need a crypto wallet?",
    a: "Yes — any wallet that holds USDT on Tron works: Trust Wallet, Binance, OKX, Tronlink, hardware wallets, or any exchange that lets you withdraw on the Tron network. You scan the QR code or copy the address, then send.",
  },
  {
    q: "Is this safe?",
    a: "We never custody your funds. You pay the airline price plus a small service fee — no upsells, no hidden conversions. Tickets are issued by the airline directly through our travel partner.",
  },
  {
    q: "What if my flight is cancelled?",
    a: "Airline cancellations are refunded under the airline's own policy, just like a card booking. We coordinate the refund with the carrier and pay you back in USDT on Tron.",
  },
  {
    q: "Can I get a refund if I change my mind?",
    a: "It depends on the fare you picked. Each ticket shows its refund and change rules before you confirm — refundable fares can be cancelled for a USDT refund, non-refundable fares cannot.",
  },
  {
    q: "Is the price I see the final price?",
    a: "Yes. The USDT total on the search card is the total you pay. It already includes the live GBP→USD rate and our 2.5% service fee. Nothing is added at checkout.",
  },
];

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

// Lucide-style line icons (1.5px stroke)
function LucideIcon({
  size = 20,
  color = "currentColor",
  children,
}: {
  size?: number;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function PlaneIcon({ color = COLOR.trvlBlue, size = 18 }: { color?: string; size?: number }) {
  return (
    <LucideIcon size={size} color={color}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </LucideIcon>
  );
}

function PinIcon({ color = COLOR.trvlBlue, size = 18 }: { color?: string; size?: number }) {
  return (
    <LucideIcon size={size} color={color}>
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
      <circle cx="12" cy="10.5" r="3" />
    </LucideIcon>
  );
}

function ArrowRightIcon({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return (
    <LucideIcon size={size} color={color}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </LucideIcon>
  );
}

function ChevronDownIcon({ color = COLOR.trvlBlue, size = 18 }: { color?: string; size?: number }) {
  return (
    <LucideIcon size={size} color={color}>
      <path d="m6 9 6 6 6-6" />
    </LucideIcon>
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);
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
      const slices = validLegs.map((leg) => ({
        origin: leg.originSelected as string,
        destination: leg.destinationSelected as string,
        departure_date: leg.date,
      }));
      sessionStorage.setItem(
        "searchParams",
        JSON.stringify({
          tripType: "multicity",
          legs: validLegs,
          slices,
          passengers: totalPassengers,
          cabinClass,
          cabin_class: cabinClass,
        }),
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
      const slices =
        tripType === "roundtrip"
          ? [
              { origin: resolvedOrigin, destination: resolvedDestination, departure_date: date },
              { origin: resolvedDestination, destination: resolvedOrigin, departure_date: returnDate },
            ]
          : [{ origin: resolvedOrigin, destination: resolvedDestination, departure_date: date }];
      sessionStorage.setItem(
        "searchParams",
        JSON.stringify({
          tripType,
          origin: resolvedOrigin,
          destination: resolvedDestination,
          departure_date: date,
          returnDate,
          slices,
          passengers: totalPassengers,
          cabinClass,
          cabin_class: cabinClass,
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
              className="w-full bg-transparent border-0 outline-none p-0 text-[15px] font-medium placeholder:font-normal"
              style={{ fontFamily: BODY_STACK, color: COLOR.navy }}
            />
            {selected && (
              <div className="text-[11px] truncate mt-[1px]" style={{ color: COLOR.muted }}>
                {selected} · {query}
              </div>
            )}
          </div>
        </div>
        {suggestions.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[220px] overflow-y-auto rounded-xl"
            style={{
              background: COLOR.surface2,
              border: `1px solid ${COLOR.borderSoft}`,
              boxShadow: NAVY_SHADOW_LG,
            }}
          >
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.iata_code}-${suggestion.name}`}
                type="button"
                onClick={() => onPick(suggestion)}
                className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-[#F7F7F8]"
                style={{ color: COLOR.navy }}
              >
                <span className="font-semibold">{suggestion.iata_code}</span>
                <span style={{ color: COLOR.muted }}> — {suggestion.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDateChip = (label: string, value: string, onChange: (v: string) => void, highlight = false) => (
    <div>
      <div style={{ ...FIELD_LABEL_STYLE, color: highlight ? COLOR.trvlBlue : FIELD_LABEL_STYLE.color }}>{label}</div>
      <div
        className="relative"
        style={{
          ...FIELD_CHIP_STYLE,
          background: highlight ? COLOR.trvlBlue50 : FIELD_CHIP_STYLE.background,
          border: highlight ? `1px solid ${COLOR.trvlBlue100}` : FIELD_CHIP_STYLE.border,
        }}
      >
        <div
          className="text-[15px] font-medium pointer-events-none"
          style={{ color: highlight ? COLOR.trvlBlueDark : COLOR.navy }}
        >
          {value ? formatLongDate(value) : <span style={{ color: COLOR.muted, fontWeight: 400 }}>Select date</span>}
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
          style={FIELD_CHIP_STYLE}
        >
          <div className="text-[15px] font-medium" style={{ color: COLOR.navy }}>
            {totalPassengers} · {cabinClassLabel}
          </div>
        </button>
        {showPaxDropdown && (
          <div
            ref={compactLabel ? paxDropdownRef : undefined}
            className="absolute top-full right-0 z-50 mt-2 w-72 rounded-2xl p-4"
            style={{
              background: COLOR.surface2,
              border: `1px solid ${COLOR.borderSoft}`,
              boxShadow: NAVY_SHADOW_LG,
            }}
          >
            {[
              { label: "Adults", sub: "Age 12+", value: adults, set: setAdults, min: 1 },
              { label: "Children", sub: "Age 2-11", value: children, set: setChildren, min: 0 },
              { label: "Infants", sub: "Age 0-1", value: infants, set: setInfants, min: 0 },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: `1px solid ${COLOR.borderSoft}` }}
              >
                <div>
                  <div className="text-[13px] font-medium" style={{ color: COLOR.navy }}>{row.label}</div>
                  <div className="text-[11px]" style={{ color: COLOR.muted }}>{row.sub}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => row.set(Math.max(row.min, row.value - 1))}
                    className="w-7 h-7 rounded-full font-medium"
                    style={{ border: `1px solid ${COLOR.border}`, color: COLOR.trvlBlue }}
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-[13px] font-medium" style={{ color: COLOR.navy }}>{row.value}</span>
                  <button
                    type="button"
                    onClick={() => row.set(Math.min(9, row.value + 1))}
                    className="w-7 h-7 rounded-full font-medium"
                    style={{ border: `1px solid ${COLOR.border}`, color: COLOR.trvlBlue }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-3">
              <div className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-2" style={{ color: COLOR.muted }}>
                Cabin class
              </div>
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
                    className="py-1.5 px-2 rounded-lg text-[12px] font-medium transition-colors"
                    style={{
                      background: cabinClass === cls.value ? COLOR.trvlBlue : COLOR.surface,
                      color: cabinClass === cls.value ? "#FFFFFF" : COLOR.navy,
                      border: cabinClass === cls.value ? `1px solid ${COLOR.trvlBlue}` : `1px solid ${COLOR.border}`,
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
              className="w-full mt-4 py-2 rounded-xl text-[13px] font-semibold"
              style={{ background: COLOR.trvlBlue, color: "#FFFFFF" }}
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
    <main style={{ fontFamily: FONT_STACK, background: COLOR.surface, minHeight: "100vh", color: COLOR.navy }}>
      {/* NAVBAR */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "rgba(247, 247, 248, 0.85)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: `1px solid ${COLOR.borderSoft}`,
        }}
      >
        <div
          className="flex items-center justify-between mx-auto"
          style={{ maxWidth: 1280, padding: "16px 32px" }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLOR.trvlBlue} 0%, ${COLOR.trvlBlueDark} 100%)`,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: FONT_STACK,
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "-0.02em",
                color: COLOR.navy,
              }}
            >
              TRVL<span style={{ color: COLOR.trvlBlue }}>scan</span>
            </span>
          </div>
          <div className="flex items-center" style={{ gap: 12 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: COLOR.surface2,
                border: `1px solid ${COLOR.border}`,
              }}
              aria-label="Account"
            >
              <LucideIcon size={16} color={COLOR.navy}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </LucideIcon>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "96px 0 32px" }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          <div className="mx-auto text-center" style={{ maxWidth: 960 }}>
            <div className="flex items-center justify-center" style={{ gap: 10, marginBottom: 24 }}>
              <span
                aria-hidden="true"
                style={{
                  position: "relative",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: COLOR.usdtGreen,
                  display: "inline-flex",
                }}
              >
                <span
                  aria-hidden="true"
                  className="trvl-pulse"
                  style={{
                    position: "absolute",
                    inset: -3,
                    borderRadius: 999,
                    background: COLOR.usdtGreen,
                    opacity: 0.45,
                  }}
                />
              </span>
              <span
                style={{
                  fontFamily: BODY_STACK,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: COLOR.muted,
                }}
              >
                Live · 500+ airlines
              </span>
            </div>
            <h1
              className="text-[48px] sm:text-[64px] lg:text-[88px]"
              style={{
                fontFamily: FONT_STACK,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.02,
                color: COLOR.navy,
                margin: 0,
              }}
            >
              Fly anywhere.
              <br />
              <span
                style={{
                  color: COLOR.trvlBlue,
                  backgroundImage: `linear-gradient(180deg, transparent 70%, rgba(15, 169, 88, 0.35) 70%)`,
                  padding: "0 4px",
                }}
              >
                Pay in crypto.
              </span>
            </h1>
            <p
              className="text-[17px] sm:text-[19px]"
              style={{
                fontFamily: BODY_STACK,
                color: COLOR.muted,
                lineHeight: 1.55,
                marginTop: 28,
                maxWidth: 600,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Search the world&apos;s flights and pay with stablecoins from any wallet. Your e-ticket arrives in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* SEARCH FORM */}
      <section style={{ paddingBottom: 96 }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          <div
            className="mx-auto"
            style={{
              maxWidth: 960,
              background: COLOR.surface2,
              borderRadius: 24,
              border: `1px solid ${COLOR.borderSoft}`,
              boxShadow: NAVY_SHADOW_LG,
              padding: 24,
            }}
          >
            {/* TAB BAR */}
            <div
              className="flex"
              style={{
                background: COLOR.surface,
                borderRadius: 12,
                padding: 4,
                marginBottom: 20,
                width: "fit-content",
              }}
            >
              {tabs.map((t) => {
                const active = tripType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTripType(t.key)}
                    style={{
                      background: active ? COLOR.surface2 : "transparent",
                      color: active ? COLOR.navy : COLOR.muted,
                      fontWeight: 600,
                      fontSize: 13,
                      padding: "8px 18px",
                      borderRadius: 8,
                      border: active ? `1px solid ${COLOR.borderSoft}` : "1px solid transparent",
                      boxShadow: active ? NAVY_SHADOW_SM : "none",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* FIELDS */}
            {(tripType === "oneway" || tripType === "roundtrip") && (
              <div className="flex flex-col" style={{ gap: 14 }}>
                <div
                  className="grid grid-cols-1 lg:grid-cols-2 lg:items-end"
                  style={{ gap: 14, position: "relative" }}
                >
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
                    "Departure city or airport",
                  )}
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
                    "Arrival city or airport",
                  )}
                  <button
                    type="button"
                    onClick={swapOriginDestination}
                    aria-label="Swap origin and destination"
                    className="hidden lg:flex items-center justify-center"
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: 8,
                      transform: "translateX(-50%)",
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      background: COLOR.surface2,
                      color: COLOR.trvlBlue,
                      border: `1px solid ${COLOR.border}`,
                      boxShadow: NAVY_SHADOW_SM,
                    }}
                  >
                    <LucideIcon size={16} color={COLOR.trvlBlue}>
                      <path d="M7 10h14l-4-4" />
                      <path d="M17 14H3l4 4" />
                    </LucideIcon>
                  </button>
                </div>

                {tripType === "oneway" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
                    {renderDateChip("DATE", date, setDate)}
                    {renderPassengersChip()}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 14 }}>
                      {renderDateChip("DEPART", date, setDate)}
                      {renderDateChip("RETURN", returnDate, setReturnDate, true)}
                      <div className="sm:col-span-2 lg:col-span-1">{renderPassengersChip()}</div>
                    </div>
                    {date && returnDate && (
                      <div
                        className="flex items-center"
                        style={{
                          background: COLOR.trvlBlue50,
                          padding: "10px 14px",
                          borderRadius: 10,
                          gap: 10,
                        }}
                      >
                        <LucideIcon size={14} color={COLOR.trvlBlueDark}>
                          <path d="M3 12h18" />
                          <path d="M15 6l6 6-6 6" />
                          <path d="M9 18l-6-6 6-6" />
                        </LucideIcon>
                        <span style={{ fontFamily: BODY_STACK, fontSize: 12, color: COLOR.trvlBlueDark, fontWeight: 500 }}>
                          {nightsBetween(date, returnDate)} nights · Round trip
                        </span>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex items-center justify-center w-full transition-colors"
                  style={{
                    marginTop: 4,
                    padding: "16px 24px",
                    background: COLOR.trvlBlue,
                    color: "#FFFFFF",
                    borderRadius: 16,
                    fontSize: 15,
                    fontWeight: 600,
                    gap: 10,
                    fontFamily: BODY_STACK,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = COLOR.trvlBlueDark)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = COLOR.trvlBlue)}
                >
                  {buttonLabel}
                  <ArrowRightIcon color="#FFFFFF" />
                </button>
              </div>
            )}

            {tripType === "multicity" && (
              <div className="flex flex-col" style={{ gap: 12 }}>
                {multiCityRows.map((leg, idx) => (
                  <div key={idx} className="flex items-end" style={{ gap: 10 }}>
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        background: COLOR.trvlBlue,
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: 700,
                        marginBottom: 14,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div
                      className="flex-1"
                      style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}
                    >
                      {/* FROM */}
                      <div className="relative">
                        <div style={FIELD_LABEL_STYLE}>FROM</div>
                        <div style={{ ...FIELD_CHIP_STYLE, padding: "10px 12px", minHeight: 44 }}>
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
                            className="w-full bg-transparent border-0 outline-none p-0 text-[14px] font-medium uppercase placeholder:font-normal"
                            style={{ fontFamily: BODY_STACK, color: COLOR.navy }}
                          />
                        </div>
                        {(multiCityOriginSuggestions[idx] ?? []).length > 0 && (
                          <div
                            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[200px] overflow-y-auto rounded-xl"
                            style={{
                              background: COLOR.surface2,
                              border: `1px solid ${COLOR.borderSoft}`,
                              boxShadow: NAVY_SHADOW_LG,
                            }}
                          >
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
                                className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-[#F7F7F8]"
                                style={{ color: COLOR.navy }}
                              >
                                <span className="font-semibold">{s.iata_code}</span>
                                <span style={{ color: COLOR.muted }}> — {s.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* TO */}
                      <div className="relative">
                        <div style={FIELD_LABEL_STYLE}>TO</div>
                        <div style={{ ...FIELD_CHIP_STYLE, padding: "10px 12px", minHeight: 44 }}>
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
                            className="w-full bg-transparent border-0 outline-none p-0 text-[14px] font-medium uppercase placeholder:font-normal"
                            style={{ fontFamily: BODY_STACK, color: COLOR.navy }}
                          />
                        </div>
                        {(multiCityDestinationSuggestions[idx] ?? []).length > 0 && (
                          <div
                            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[200px] overflow-y-auto rounded-xl"
                            style={{
                              background: COLOR.surface2,
                              border: `1px solid ${COLOR.borderSoft}`,
                              boxShadow: NAVY_SHADOW_LG,
                            }}
                          >
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
                                className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-[#F7F7F8]"
                                style={{ color: COLOR.navy }}
                              >
                                <span className="font-semibold">{s.iata_code}</span>
                                <span style={{ color: COLOR.muted }}> — {s.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* DATE */}
                      <div className="relative">
                        <div style={FIELD_LABEL_STYLE}>DATE</div>
                        <div
                          className="relative"
                          style={{
                            ...FIELD_CHIP_STYLE,
                            padding: "10px 12px",
                            minHeight: 44,
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            minWidth: 88,
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 500, color: COLOR.navy }}>
                            {leg.date ? formatShortDate(leg.date) : <span style={{ color: COLOR.muted, fontWeight: 400 }}>Pick</span>}
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
                              top: 14,
                              right: -8,
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              background: "#FEE2E2",
                              border: `1px solid #FCA5A5`,
                            }}
                            aria-label="Remove flight"
                          >
                            <LucideIcon size={10} color="#B91C1C">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </LucideIcon>
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
                    padding: 12,
                    background: "transparent",
                    border: `1px dashed ${COLOR.trvlBlue}`,
                    color: COLOR.trvlBlue,
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    gap: 6,
                    opacity: multiCityLegs.length >= 5 ? 0.5 : 1,
                    cursor: multiCityLegs.length >= 5 ? "not-allowed" : "pointer",
                  }}
                >
                  <LucideIcon size={14} color="currentColor">
                    <path d="M12 5v14M5 12h14" />
                  </LucideIcon>
                  Add another flight
                </button>

                {renderPassengersChip()}

                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex items-center justify-center w-full transition-colors"
                  style={{
                    marginTop: 4,
                    padding: "14px 24px",
                    background: COLOR.trvlBlue,
                    color: "#FFFFFF",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    gap: 10,
                    fontFamily: BODY_STACK,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = COLOR.trvlBlueDark)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = COLOR.trvlBlue)}
                >
                  {buttonLabel}
                  <ArrowRightIcon color="#FFFFFF" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* WHY PAY IN CRYPTO — FEATURES */}
      <section style={{ padding: "32px 0 96px" }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          <span
            style={{
              fontFamily: BODY_STACK,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLOR.trvlBlue,
              display: "block",
              marginBottom: 16,
            }}
          >
            Why pay in crypto
          </span>
          <h2
            className="text-[32px] sm:text-[44px] lg:text-[56px]"
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: COLOR.navy,
              marginBottom: 24,
            }}
          >
            Search. Pay. Fly.
          </h2>
          <p
            style={{
              fontFamily: BODY_STACK,
              fontSize: 19,
              color: COLOR.muted,
              lineHeight: 1.55,
              maxWidth: 720,
              marginBottom: 64,
            }}
          >
            Stablecoins from your wallet, e-ticket in your inbox. Less than five minutes, end to end.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
            {[
              {
                title: "No bank, no card, no FX games",
                desc: "Pay straight from your wallet. No card forms, no surprise foreign-exchange fees, no chargeback drama.",
                icon: (
                  <LucideIcon size={24} color={COLOR.trvlBlue}>
                    <rect x="2" y="6" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                    <path d="M16 14h2" />
                  </LucideIcon>
                ),
              },
              {
                title: "Search 500+ airlines worldwide",
                desc: "One search across the global Duffel network. Cheapest fare every time, with the full route on display.",
                icon: (
                  <LucideIcon size={24} color={COLOR.trvlBlue}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3a14 14 0 0 1 0 18" />
                    <path d="M12 3a14 14 0 0 0 0 18" />
                  </LucideIcon>
                ),
              },
              {
                title: "E-ticket in seconds, not days",
                desc: "Stablecoins settle in minutes. Your ticket arrives by email before you've put your phone down.",
                icon: (
                  <LucideIcon size={24} color={COLOR.trvlBlue}>
                    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                  </LucideIcon>
                ),
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  background: COLOR.surface2,
                  borderRadius: 16,
                  border: `1px solid ${COLOR.borderSoft}`,
                  padding: 28,
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: COLOR.trvlBlue50,
                    marginBottom: 20,
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontFamily: FONT_STACK,
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: "-0.01em",
                    color: COLOR.navy,
                    marginBottom: 10,
                    lineHeight: 1.25,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontFamily: BODY_STACK,
                    fontSize: 15,
                    color: COLOR.muted,
                    lineHeight: 1.6,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR DESTINATIONS */}
      <section style={{ padding: "32px 0 96px" }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          <span
            style={{
              fontFamily: BODY_STACK,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLOR.trvlBlue,
              display: "block",
              marginBottom: 16,
            }}
          >
            Trending routes
          </span>
          <h2
            className="text-[32px] sm:text-[40px] lg:text-[48px]"
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              color: COLOR.navy,
              marginBottom: 16,
            }}
          >
            Where the world is flying.
          </h2>
          <p
            style={{
              fontFamily: BODY_STACK,
              fontSize: 17,
              color: COLOR.muted,
              lineHeight: 1.55,
              maxWidth: 640,
              marginBottom: 48,
            }}
          >
            Indicative USDT prices on the eight routes our travellers book most this week.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
            {DESTINATIONS.map((d, i) => (
              <button
                key={`${d.origin}-${d.destination}-${i}`}
                type="button"
                onClick={() => handleDestinationClick(d.origin, d.destination)}
                className="text-left transition-transform hover:-translate-y-0.5"
                style={{
                  background: COLOR.surface2,
                  borderRadius: 16,
                  border: `1px solid ${COLOR.borderSoft}`,
                  overflow: "hidden",
                  cursor: "pointer",
                  transitionDuration: "150ms",
                  transitionTimingFunction: "ease",
                }}
              >
                <div className="relative" style={{ height: 120, background: d.bg }}>
                  <DestinationArt icon={d.icon} dark={d.dark} />
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <div
                    style={{
                      fontFamily: FONT_STACK,
                      fontSize: 17,
                      fontWeight: 700,
                      color: COLOR.navy,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {d.city}
                  </div>
                  <div
                    style={{
                      fontFamily: BODY_STACK,
                      fontSize: 12,
                      color: COLOR.muted,
                      marginTop: 2,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {d.origin} → {d.destination}
                  </div>
                  <div className="flex items-baseline" style={{ gap: 4, marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: COLOR.muted, fontFamily: BODY_STACK }}>from</span>
                    <span
                      style={{
                        fontFamily: FONT_STACK,
                        fontSize: 17,
                        fontWeight: 700,
                        color: COLOR.trvlBlue,
                      }}
                    >
                      {d.price} USDT
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "32px 0 96px" }}>
        <div className="mx-auto" style={{ maxWidth: 880, padding: "0 32px" }}>
          <span
            style={{
              fontFamily: BODY_STACK,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLOR.trvlBlue,
              display: "block",
              marginBottom: 16,
            }}
          >
            FAQ
          </span>
          <h2
            className="text-[32px] sm:text-[40px] lg:text-[48px]"
            style={{
              fontFamily: FONT_STACK,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              color: COLOR.navy,
              marginBottom: 48,
            }}
          >
            Everything you might wonder.
          </h2>

          <div
            style={{
              background: COLOR.surface2,
              borderRadius: 16,
              border: `1px solid ${COLOR.borderSoft}`,
              overflow: "hidden",
            }}
          >
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  style={{ borderBottom: i === FAQS.length - 1 ? "none" : `1px solid ${COLOR.borderSoft}` }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full text-left flex items-center justify-between"
                    style={{
                      padding: "20px 24px",
                      background: "transparent",
                      gap: 16,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_STACK,
                        fontWeight: 700,
                        fontSize: 17,
                        letterSpacing: "-0.01em",
                        color: COLOR.navy,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.q}
                    </span>
                    <span
                      className="flex-shrink-0"
                      style={{
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 200ms ease",
                        color: COLOR.trvlBlue,
                      }}
                    >
                      <ChevronDownIcon />
                    </span>
                  </button>
                  {open && (
                    <div
                      style={{
                        padding: "0 24px 22px",
                        fontFamily: BODY_STACK,
                        fontSize: 15,
                        color: COLOR.muted,
                        lineHeight: 1.65,
                        maxWidth: 720,
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: COLOR.navy, color: "rgba(255, 255, 255, 0.7)", padding: "64px 0" }}>
        <div
          className="mx-auto flex flex-wrap items-center justify-between"
          style={{ maxWidth: 1280, padding: "0 32px", gap: 24 }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLOR.trvlBlue} 0%, ${COLOR.trvlBlueDark} 100%)`,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: FONT_STACK,
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
              }}
            >
              TRVL<span style={{ color: COLOR.trvlBlueLight }}>scan</span>
            </span>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', 'Menlo', monospace",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            © 2026 · Pay in crypto · Fly anywhere
          </div>
        </div>
      </footer>

      {/* PULSE ANIMATION */}
      <style jsx global>{`
        @keyframes trvl-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          70% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .trvl-pulse {
          animation: trvl-pulse 1.8s ease-out infinite;
        }
      `}</style>
    </main>
  );
}
