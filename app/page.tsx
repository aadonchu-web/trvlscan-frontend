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
const MONO_STACK = "'JetBrains Mono', ui-monospace, 'Menlo', monospace";

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
  surfaceLine: "#ECEDF1",
  border: "#E5E7EB",
  borderSoft: "#F0F1F3",
  muted: "#6B7280",
  mutedSoft: "#9CA3AF",
  navyTint: "#42527A",
  warning: "#D97706",
  warningBg: "#FEF3C7",
};

const NAVY_SHADOW_SM = "0 2px 12px rgba(10, 27, 61, 0.05)";
const NAVY_SHADOW_LG = "0 12px 40px rgba(10, 27, 61, 0.08)";
const NAVY_SHADOW_CARD = "0 4px 24px rgba(10, 27, 61, 0.06)";
const TRVL_POP_SHADOW = "0 1px 0 rgba(27,79,255,0.10), 0 18px 32px -16px rgba(27,79,255,0.45)";

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

const SKY_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: COLOR.mutedSoft,
  fontFamily: MONO_STACK,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const SKY_CAPTION_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: COLOR.muted,
  fontFamily: BODY_STACK,
};

const PILL_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: COLOR.surface2,
  border: `1px solid ${COLOR.surfaceLine}`,
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 13,
  color: COLOR.navy,
  fontFamily: BODY_STACK,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const DESTINATIONS = [
  { city: "London", origin: "DXB", destination: "LHR", price: 450, bg: "#378ADD", dark: "#1C5E9E", icon: "bigben" as const, region: "Europe", coords: "51°N" },
  { city: "Bangkok", origin: "DXB", destination: "BKK", price: 320, bg: "#EF9F27", dark: "#A96E12", icon: "temple" as const, region: "Asia", coords: "14°N" },
  { city: "Istanbul", origin: "DXB", destination: "IST", price: 280, bg: "#D4537E", dark: "#8E2F56" , icon: "mosque" as const, region: "Europe", coords: "41°N" },
  { city: "New York", origin: "LHR", destination: "JFK", price: 440, bg: "#534AB7", dark: "#352D87", icon: "skyline" as const, region: "N. America", coords: "40°N" },
  { city: "Barcelona", origin: "LHR", destination: "BCN", price: 180, bg: "#E24B4A", dark: "#9E2B2A", icon: "sagrada" as const, region: "Europe", coords: "41°N" },
  { city: "Paris", origin: "DXB", destination: "CDG", price: 520, bg: "#1D9E75", dark: "#106A4E", icon: "eiffel" as const, region: "Europe", coords: "49°N" },
  { city: "Dubai", origin: "LHR", destination: "DXB", price: 480, bg: "#F09595", dark: "#B2595A", icon: "burj" as const, region: "Mid-East", coords: "25°N" },
  { city: "London", origin: "BKK", destination: "LHR", price: 380, bg: "#7F77DD", dark: "#4E45A8", icon: "bigben-moon" as const, region: "Europe", coords: "51°N" },
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

function PaperPlaneIcon({ color = "#FFFFFF", size = 18 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11.5 21 4l-7.5 18-2.4-7.7L3 11.5Z" />
    </svg>
  );
}

function SearchIcon({ color = "currentColor", size = 18 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SwapIcon({ color = "currentColor", size = 14 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 4 4 7l3 3M4 7h13a4 4 0 0 1 0 8M17 20l3-3-3-3M20 17H7a4 4 0 0 1 0-8" />
    </svg>
  );
}

function GreenCheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={COLOR.usdtGreen}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 5 5L20 7" />
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const router = useRouter();

  const [multiCityOriginSuggestions, setMultiCityOriginSuggestions] = useState<AirportSuggestion[][]>([[], []]);
  const [multiCityDestinationSuggestions, setMultiCityDestinationSuggestions] = useState<AirportSuggestion[][]>([[], []]);
  const paxDropdownRef = useRef<HTMLDivElement>(null);

  // Additive UI-only state for the new Skyscanner-style trip-type and cabin-class pills
  const [showTripDropdown, setShowTripDropdown] = useState(false);
  const [showCabinDropdown, setShowCabinDropdown] = useState(false);
  const tripDropdownRef = useRef<HTMLDivElement>(null);
  const cabinDropdownRef = useRef<HTMLDivElement>(null);

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

  // Click-outside for the new Skyscanner-style trip & cabin pills (additive)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tripDropdownRef.current && !tripDropdownRef.current.contains(event.target as Node)) {
        setShowTripDropdown(false);
      }
      if (cabinDropdownRef.current && !cabinDropdownRef.current.contains(event.target as Node)) {
        setShowCabinDropdown(false);
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

  const tripTypeLabel =
    tripType === "oneway" ? "One way" : tripType === "roundtrip" ? "Round trip" : "Multi-city";

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

  // ──────── Skyscanner-style render helpers ────────

  const renderAirportField = (
    label: string,
    query: string,
    selected: string | null,
    suggestions: AirportSuggestion[],
    onChange: (value: string) => void,
    onPick: (s: AirportSuggestion) => void,
    placeholder: string,
  ) => (
    <div className="flex-1 min-w-0 relative" style={{ padding: "14px 20px" }}>
      <div style={SKY_LABEL_STYLE}>{label}</div>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-0 outline-none p-0 mt-1 text-[19px] font-semibold truncate"
        style={{ fontFamily: FONT_STACK, color: COLOR.navy }}
      />
      <div style={{ ...SKY_CAPTION_STYLE, marginTop: 1, minHeight: 18 }} className="truncate">
        {selected ? selected : <span style={{ color: COLOR.mutedSoft }}>Search a city</span>}
      </div>
      {suggestions.length > 0 && (
        <div
          className="absolute left-3 right-3 top-full z-40 mt-1 max-h-[220px] overflow-y-auto rounded-xl"
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
  );

  const renderDateChip = (label: string, value: string, onChange: (v: string) => void, caption?: string) => (
    <div className="relative" style={{ padding: "14px 20px", minWidth: 0 }}>
      <div style={SKY_LABEL_STYLE}>{label}</div>
      <div
        className="text-[19px] font-semibold pointer-events-none mt-1 truncate"
        style={{ color: value ? COLOR.navy : COLOR.mutedSoft, fontFamily: FONT_STACK }}
      >
        {value ? formatLongDate(value) : "Select date"}
      </div>
      <div style={{ ...SKY_CAPTION_STYLE, minHeight: 18 }} className="truncate">
        {caption ?? (value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }) : "—")}
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );

  const renderPassengersChip = () => (
    <div className="relative" ref={paxDropdownRef} style={{ minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setShowPaxDropdown((v) => !v)}
        className="w-full text-left"
        style={{ padding: "14px 20px" }}
      >
        <div style={SKY_LABEL_STYLE}>TRAVELERS</div>
        <div
          className="text-[19px] font-semibold mt-1 truncate"
          style={{ color: COLOR.navy, fontFamily: FONT_STACK }}
        >
          {totalPassengers} {totalPassengers === 1 ? "Adult" : "Travellers"}
        </div>
        <div style={{ ...SKY_CAPTION_STYLE, minHeight: 18 }} className="truncate">
          {cabinClassLabel}
        </div>
      </button>
      {showPaxDropdown && (
        <div
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
  );

  const SearchSubmit = ({ wide = false }: { wide?: boolean }) => (
    <button
      type="button"
      onClick={handleSearch}
      className="flex items-center justify-center gap-2 transition-colors"
      style={{
        background: COLOR.trvlBlue,
        color: "#FFFFFF",
        fontFamily: BODY_STACK,
        fontWeight: 600,
        fontSize: 15,
        padding: "0 28px",
        minHeight: wide ? 64 : "100%",
        minWidth: 140,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = COLOR.trvlBlueDark)}
      onMouseLeave={(e) => (e.currentTarget.style.background = COLOR.trvlBlue)}
    >
      <SearchIcon color="#FFFFFF" size={18} />
      Search
    </button>
  );

  // Vertical 1px divider between Skyscanner cells
  const VDiv = ({ desktopOnly = false }: { desktopOnly?: boolean }) => (
    <div
      className={desktopOnly ? "hidden md:block" : ""}
      style={{ width: 1, background: COLOR.surfaceLine, alignSelf: "stretch" }}
      aria-hidden="true"
    />
  );

  const HDiv = () => (
    <div style={{ height: 1, background: COLOR.surfaceLine }} aria-hidden="true" />
  );

  return (
    <main style={{ fontFamily: FONT_STACK, background: COLOR.surface, minHeight: "100vh", color: COLOR.navy }}>
      {/* ─────────── NAV ─────────── */}
      <header className="relative z-30">
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "24px 32px 0" }}>
          <nav
            className="flex items-center justify-between"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: `1px solid ${COLOR.surfaceLine}`,
              borderRadius: 16,
              padding: "10px 16px",
            }}
          >
            <a href="#" className="flex items-center" style={{ gap: 10 }} aria-label="TRVLscan home">
              <span
                aria-hidden="true"
                className="grid place-items-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: COLOR.navy,
                  color: "#FFFFFF",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <PaperPlaneIcon size={18} />
              </span>
              <span
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 600,
                  fontSize: 19,
                  letterSpacing: "-0.02em",
                  color: COLOR.navy,
                }}
              >
                TRVLscan
              </span>
            </a>
            <button
              type="button"
              aria-label="Account"
              className="grid place-items-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: COLOR.trvlBlue50,
                color: COLOR.navy,
                border: `1px solid ${COLOR.surfaceLine}`,
                cursor: "pointer",
              }}
            >
              <LucideIcon size={16} color={COLOR.navy}>
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </LucideIcon>
            </button>
          </nav>
        </div>
      </header>

      {/* ─────────── HERO ─────────── */}
      <section className="relative">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(10, 27, 61, 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(10, 27, 61, 0.045) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            backgroundPosition: "-1px -1px",
          }}
        />
        <div
          className="relative mx-auto"
          style={{ maxWidth: 1280, padding: "40px 32px 32px" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 48, alignItems: "start" }}>
            {/* LEFT: copy column */}
            <div className="lg:col-span-7">
              <div
                className="inline-flex items-center"
                style={{
                  gap: 8,
                  background: COLOR.surface2,
                  border: `1px solid ${COLOR.surfaceLine}`,
                  boxShadow: NAVY_SHADOW_CARD,
                  borderRadius: 999,
                  padding: "4px 12px 4px 6px",
                  fontSize: 12,
                  color: COLOR.navyTint,
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    background: COLOR.usdtGreenLight,
                    color: COLOR.usdtGreenDark,
                    fontFamily: MONO_STACK,
                    fontWeight: 500,
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  USDT · USDC
                </span>
                <span style={{ fontFamily: BODY_STACK }}>Stablecoins supported on Tron, Ethereum, Solana</span>
              </div>

              <h1
                className="text-[80px] sm:text-[88px] lg:text-[96px]"
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  lineHeight: 0.9,
                  margin: 0,
                }}
              >
                <span style={{ display: "block", color: COLOR.navy }}>Fly anywhere.</span>
                <span style={{ display: "block", color: COLOR.trvlBlue }}>
                  Pay in{" "}
                  <span
                    style={{
                      backgroundImage:
                        "linear-gradient(transparent 62%, rgba(15, 169, 88, 0.32) 62%, rgba(15, 169, 88, 0.32) 92%, transparent 92%)",
                      backgroundRepeat: "no-repeat",
                      padding: "0 0.05em",
                    }}
                  >
                    crypto
                  </span>
                  .
                </span>
              </h1>

              <p
                style={{
                  fontFamily: BODY_STACK,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: COLOR.navyTint,
                  marginTop: 20,
                  maxWidth: 540,
                }}
              >
                Search every airline. Book real tickets. Settle in stablecoins — no bank, no card, no
                &ldquo;premium upgrade.&rdquo; Just the fare you saw, plus a small fee, in USDT or USDC.
              </p>

              <div className="flex flex-wrap items-center" style={{ gap: 16, marginTop: 24 }}>
                <a
                  href="#search"
                  className="inline-flex items-center justify-center"
                  style={{
                    gap: 8,
                    background: COLOR.trvlBlue,
                    color: "#FFFFFF",
                    fontFamily: BODY_STACK,
                    fontWeight: 500,
                    fontSize: 15,
                    height: 48,
                    padding: "0 24px",
                    borderRadius: 12,
                    boxShadow: TRVL_POP_SHADOW,
                  }}
                >
                  Search flights
                  <ArrowRightIcon color="#FFFFFF" size={16} />
                </a>
                <a
                  href="#how"
                  className="inline-flex items-center"
                  style={{
                    gap: 8,
                    color: COLOR.navy,
                    fontFamily: BODY_STACK,
                    fontWeight: 500,
                    fontSize: 15,
                    height: 48,
                    padding: "0 8px",
                  }}
                >
                  How payment works
                  <LucideIcon size={16} color={COLOR.navy}>
                    <path d="M9 18l6-6-6-6" />
                  </LucideIcon>
                </a>
              </div>

              {/* Three stat-blocks */}
              <div
                className="grid grid-cols-3"
                style={{ gap: 24, marginTop: 32, maxWidth: 540, fontSize: 13 }}
              >
                {[
                  { num: "2.5%", caption: "Flat fee. No FX surprise." },
                  { num: "12 min", caption: "Hold window per booking." },
                  { num: "450+", caption: "Airlines via IATA settlement." },
                ].map((s) => (
                  <div key={s.num}>
                    <div
                      style={{
                        fontFamily: MONO_STACK,
                        fontSize: 20,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: COLOR.navy,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {s.num}
                    </div>
                    <div style={{ color: COLOR.navyTint, marginTop: 2, fontFamily: BODY_STACK }}>
                      {s.caption}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: live booking card showcase (static marketing content) */}
            <div className="lg:col-span-5" style={{ marginTop: 8 }}>
              <div className="relative">
                <div
                  className="absolute"
                  style={{
                    top: -12,
                    left: 24,
                    zIndex: 10,
                    fontFamily: MONO_STACK,
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    color: COLOR.navyTint,
                    background: COLOR.surface,
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  LIVE BOOKING · TRVL/0834
                </div>

                <div
                  style={{
                    background: COLOR.surface2,
                    borderRadius: 20,
                    boxShadow: NAVY_SHADOW_LG,
                    padding: 20,
                  }}
                >
                  <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span
                        aria-hidden="true"
                        className="trvl-pulse-host"
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
                            border: `2px solid ${COLOR.usdtGreen}`,
                            opacity: 0.4,
                          }}
                        />
                      </span>
                      <span style={{ color: COLOR.navyTint, fontFamily: BODY_STACK }}>
                        Available · 3 seats at this fare
                      </span>
                    </div>
                    <span style={{ fontFamily: MONO_STACK, color: COLOR.navyTint }}>14 May · Wed</span>
                  </div>

                  <div className="flex items-center" style={{ gap: 12, marginTop: 20 }}>
                    <div style={{ textAlign: "left" }}>
                      <div
                        style={{
                          fontFamily: FONT_STACK,
                          fontWeight: 700,
                          fontSize: 40,
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                          color: COLOR.navy,
                        }}
                      >
                        LHR
                      </div>
                      <div style={{ fontFamily: MONO_STACK, fontSize: 11, color: COLOR.navyTint, marginTop: 8 }}>
                        London Heathrow
                      </div>
                      <div
                        style={{
                          fontFamily: MONO_STACK,
                          fontSize: 13,
                          marginTop: 4,
                          fontVariantNumeric: "tabular-nums",
                          color: COLOR.navy,
                        }}
                      >
                        22:15
                      </div>
                    </div>

                    <div className="flex-1" style={{ padding: "0 12px" }}>
                      <div className="flex items-center">
                        <div
                          style={{
                            flex: 1,
                            position: "relative",
                            height: 1,
                            backgroundImage:
                              "repeating-linear-gradient(to right, #C9CDDB 0 4px, transparent 4px 8px)",
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              left: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: COLOR.navy,
                            }}
                          />
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              background: COLOR.navy,
                            }}
                          />
                        </div>
                      </div>
                      <div
                        className="text-center"
                        style={{
                          fontFamily: MONO_STACK,
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          color: COLOR.navyTint,
                          marginTop: 8,
                        }}
                      >
                        11H 30M · NONSTOP
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: FONT_STACK,
                          fontWeight: 700,
                          fontSize: 40,
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                          color: COLOR.navy,
                        }}
                      >
                        BKK
                      </div>
                      <div style={{ fontFamily: MONO_STACK, fontSize: 11, color: COLOR.navyTint, marginTop: 8 }}>
                        Bangkok Suvarnabhumi
                      </div>
                      <div
                        style={{
                          fontFamily: MONO_STACK,
                          fontSize: 13,
                          marginTop: 4,
                          fontVariantNumeric: "tabular-nums",
                          color: COLOR.navy,
                        }}
                      >
                        16:45<span style={{ color: COLOR.navyTint, fontSize: 10 }}> +1</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: COLOR.surfaceLine, margin: "16px 0" }} />

                  <div style={{ fontSize: 13 }}>
                    {[
                      { label: "Fare (Economy · 1 adult)", value: "£371.20" },
                      { label: "Conversion (GBP → USDT)", value: "×1.2742" },
                      { label: "TRVLscan fee", value: "2.5%" },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between" style={{ padding: "4px 0" }}>
                        <span style={{ color: COLOR.navyTint, fontFamily: BODY_STACK }}>{row.label}</span>
                        <span style={{ fontFamily: MONO_STACK, fontVariantNumeric: "tabular-nums", color: COLOR.navy }}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-end justify-between" style={{ marginTop: 16 }}>
                    <div>
                      <div
                        style={{
                          fontFamily: MONO_STACK,
                          fontSize: 11,
                          letterSpacing: "0.1em",
                          color: COLOR.navyTint,
                        }}
                      >
                        YOU PAY
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_STACK,
                          fontWeight: 800,
                          fontSize: 36,
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                          marginTop: 4,
                          color: COLOR.navy,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        482.30{" "}
                        <span
                          style={{
                            fontFamily: MONO_STACK,
                            fontSize: 16,
                            fontWeight: 500,
                            color: COLOR.navyTint,
                            verticalAlign: "baseline",
                          }}
                        >
                          USDT
                        </span>
                      </div>
                    </div>
                    <div
                      className="inline-flex items-center"
                      style={{
                        gap: 8,
                        background: COLOR.navy,
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: 500,
                        height: 40,
                        padding: "0 20px",
                        borderRadius: 10,
                        fontFamily: BODY_STACK,
                      }}
                    >
                      Continue
                      <ArrowRightIcon color="#FFFFFF" size={14} />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between"
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: `1px solid ${COLOR.surfaceLine}`,
                      fontSize: 11,
                      fontFamily: MONO_STACK,
                      color: COLOR.navyTint,
                      letterSpacing: "0.04em",
                    }}
                  >
                    <span>NETWORK · TRC-20</span>
                    <span>SETTLEMENT · &lt;30s</span>
                    <span>ESCROW · IATA-BSP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Index footer ribbon */}
          <div
            className="flex flex-wrap items-center"
            style={{
              gap: "8px 24px",
              marginTop: 40,
              fontSize: 12,
              fontFamily: MONO_STACK,
              color: COLOR.navyTint,
            }}
          >
            <span className="flex items-center" style={{ gap: 8 }}>
              <span
                aria-hidden="true"
                style={{ width: 6, height: 6, borderRadius: 999, background: COLOR.usdtGreen }}
              />
              INDEX UPDATED 00:14 AGO
            </span>
            <span>· 1,284 ROUTES INDEXED TODAY</span>
            <span>· USDT/GBP MID 1.2742</span>
            <span>· 0 OUTAGES PAST 24H</span>
          </div>
        </div>
      </section>

      {/* ─────────── SEARCH FORM ─────────── */}
      <section id="search" className="relative">
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          {/* Trip-type + cabin-class pills (always visible) */}
          <div className="flex items-center" style={{ gap: 12, marginBottom: 12 }}>
            <div className="relative" ref={tripDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowTripDropdown((v) => !v);
                  setShowCabinDropdown(false);
                }}
                style={PILL_STYLE}
              >
                {tripTypeLabel}
                <LucideIcon size={14} color={COLOR.navy}>
                  <path d="m6 9 6 6 6-6" />
                </LucideIcon>
              </button>
              {showTripDropdown && (
                <div
                  className="absolute left-0 top-full z-40 mt-2 rounded-xl"
                  style={{
                    background: COLOR.surface2,
                    border: `1px solid ${COLOR.surfaceLine}`,
                    boxShadow: NAVY_SHADOW_LG,
                    minWidth: 160,
                    padding: 6,
                  }}
                >
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setTripType(t.key);
                        setShowTripDropdown(false);
                      }}
                      className="w-full text-left"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        color: COLOR.navy,
                        fontWeight: tripType === t.key ? 600 : 500,
                        background: tripType === t.key ? COLOR.surface : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={cabinDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowCabinDropdown((v) => !v);
                  setShowTripDropdown(false);
                }}
                style={PILL_STYLE}
              >
                {cabinClassLabel}
                <LucideIcon size={14} color={COLOR.navy}>
                  <path d="m6 9 6 6 6-6" />
                </LucideIcon>
              </button>
              {showCabinDropdown && (
                <div
                  className="absolute left-0 top-full z-40 mt-2 rounded-xl"
                  style={{
                    background: COLOR.surface2,
                    border: `1px solid ${COLOR.surfaceLine}`,
                    boxShadow: NAVY_SHADOW_LG,
                    minWidth: 180,
                    padding: 6,
                  }}
                >
                  {[
                    { value: "economy", label: "Economy" },
                    { value: "premium_economy", label: "Premium Economy" },
                    { value: "business", label: "Business" },
                    { value: "first", label: "First" },
                  ].map((cls) => (
                    <button
                      key={cls.value}
                      type="button"
                      onClick={() => {
                        setCabinClass(cls.value);
                        setShowCabinDropdown(false);
                      }}
                      className="w-full text-left"
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        color: COLOR.navy,
                        fontWeight: cabinClass === cls.value ? 600 : 500,
                        background: cabinClass === cls.value ? COLOR.surface : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      {cls.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ONE WAY variant */}
          {tripType === "oneway" && (
            <div
              style={{
                background: COLOR.surface2,
                borderRadius: 16,
                boxShadow: NAVY_SHADOW_CARD,
                border: `1px solid ${COLOR.surfaceLine}`,
                overflow: "hidden",
              }}
            >
              <div className="flex flex-wrap md:flex-nowrap" style={{ alignItems: "stretch" }}>
                <div className="flex flex-1 min-w-0 relative w-full md:w-auto" style={{ alignItems: "stretch" }}>
                  {renderAirportField(
                    "From",
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
                  <VDiv />
                  {renderAirportField(
                    "To",
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
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: COLOR.surface2,
                      border: `1px solid ${COLOR.surfaceLine}`,
                      boxShadow: NAVY_SHADOW_CARD,
                      color: COLOR.navy,
                      display: "grid",
                      placeItems: "center",
                      zIndex: 5,
                      cursor: "pointer",
                    }}
                  >
                    <SwapIcon color={COLOR.navy} size={14} />
                  </button>
                </div>
                <VDiv desktopOnly />
                <div style={{ width: "100%" }} className="md:w-[210px]">
                  {renderDateChip("Depart", date, setDate)}
                </div>
                <VDiv desktopOnly />
                <div style={{ width: "100%" }} className="md:w-[170px]">
                  {renderPassengersChip()}
                </div>
                <SearchSubmit />
              </div>
            </div>
          )}

          {/* ROUND TRIP variant */}
          {tripType === "roundtrip" && (
            <div
              style={{
                background: COLOR.surface2,
                borderRadius: 16,
                boxShadow: NAVY_SHADOW_CARD,
                border: `1px solid ${COLOR.surfaceLine}`,
                overflow: "hidden",
              }}
            >
              <div className="flex flex-wrap md:flex-nowrap" style={{ alignItems: "stretch" }}>
                <div className="flex flex-1 min-w-0 relative w-full md:w-auto" style={{ alignItems: "stretch" }}>
                  {renderAirportField(
                    "From",
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
                  <VDiv />
                  {renderAirportField(
                    "To",
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
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: COLOR.surface2,
                      border: `1px solid ${COLOR.surfaceLine}`,
                      boxShadow: NAVY_SHADOW_CARD,
                      color: COLOR.navy,
                      display: "grid",
                      placeItems: "center",
                      zIndex: 5,
                      cursor: "pointer",
                    }}
                  >
                    <SwapIcon color={COLOR.navy} size={14} />
                  </button>
                </div>
                <VDiv desktopOnly />
                <div style={{ width: "100%" }} className="md:w-[150px]">
                  {renderDateChip("Depart", date, setDate)}
                </div>
                <VDiv desktopOnly />
                <div style={{ width: "100%" }} className="md:w-[150px]">
                  {renderDateChip("Return", returnDate, setReturnDate)}
                </div>
                <VDiv desktopOnly />
                <div style={{ width: "100%" }} className="md:w-[160px]">
                  {renderPassengersChip()}
                </div>
                <SearchSubmit />
              </div>
              {date && returnDate && (
                <div
                  style={{
                    background: COLOR.trvlBlue50,
                    padding: "8px 20px",
                    fontSize: 12,
                    color: COLOR.trvlBlueDark,
                    borderTop: `1px solid ${COLOR.surfaceLine}`,
                    fontFamily: BODY_STACK,
                  }}
                >
                  {nightsBetween(date, returnDate)} nights · Round trip
                </div>
              )}
            </div>
          )}

          {/* MULTI-CITY variant */}
          {tripType === "multicity" && (
            <div
              style={{
                background: COLOR.surface2,
                borderRadius: 16,
                boxShadow: NAVY_SHADOW_CARD,
                border: `1px solid ${COLOR.surfaceLine}`,
                overflow: "hidden",
              }}
            >
              {multiCityRows.map((leg, idx) => (
                <div key={idx}>
                  {idx > 0 && <HDiv />}
                  <div className="flex flex-wrap md:flex-nowrap" style={{ alignItems: "stretch" }}>
                    <div
                      className="flex flex-1 min-w-0 relative w-full md:w-auto"
                      style={{ alignItems: "stretch" }}
                    >
                      {/* From — leg N */}
                      <div className="flex-1 min-w-0 relative" style={{ padding: "14px 20px" }}>
                        <div style={SKY_LABEL_STYLE}>{`From · Leg ${idx + 1}`}</div>
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
                              setMultiCityOriginSuggestions((prev) =>
                                prev.map((arr, i) => (i === idx ? suggestions : arr)),
                              );
                            });
                          }}
                          className="w-full bg-transparent border-0 outline-none p-0 mt-1 text-[19px] font-semibold uppercase truncate"
                          style={{ fontFamily: FONT_STACK, color: COLOR.navy }}
                        />
                        <div style={{ ...SKY_CAPTION_STYLE, minHeight: 18 }} className="truncate">
                          {leg.originSelected ? leg.originSelected : <span style={{ color: COLOR.mutedSoft }}>Search a city</span>}
                        </div>
                        {(multiCityOriginSuggestions[idx] ?? []).length > 0 && (
                          <div
                            className="absolute left-3 right-3 top-full z-40 mt-1 max-h-[200px] overflow-y-auto rounded-xl"
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
                                    prev.map((l, i) =>
                                      i === idx
                                        ? { ...l, origin: s.iata_code, originSelected: s.iata_code }
                                        : l,
                                    ),
                                  );
                                  setMultiCityOriginSuggestions((prev) =>
                                    prev.map((arr, i) => (i === idx ? [] : arr)),
                                  );
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
                      <VDiv />
                      {/* To — leg N */}
                      <div className="flex-1 min-w-0 relative" style={{ padding: "14px 20px" }}>
                        <div style={SKY_LABEL_STYLE}>{`To · Leg ${idx + 1}`}</div>
                        <input
                          type="text"
                          value={leg.destinationSelected ?? leg.destination}
                          placeholder="LHR"
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            setMultiCityLegs((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, destination: value, destinationSelected: null } : l,
                              ),
                            );
                            searchAirports(value, (suggestions) => {
                              setMultiCityDestinationSuggestions((prev) =>
                                prev.map((arr, i) => (i === idx ? suggestions : arr)),
                              );
                            });
                          }}
                          className="w-full bg-transparent border-0 outline-none p-0 mt-1 text-[19px] font-semibold uppercase truncate"
                          style={{ fontFamily: FONT_STACK, color: COLOR.navy }}
                        />
                        <div style={{ ...SKY_CAPTION_STYLE, minHeight: 18 }} className="truncate">
                          {leg.destinationSelected ? leg.destinationSelected : <span style={{ color: COLOR.mutedSoft }}>Search a city</span>}
                        </div>
                        {(multiCityDestinationSuggestions[idx] ?? []).length > 0 && (
                          <div
                            className="absolute left-3 right-3 top-full z-40 mt-1 max-h-[200px] overflow-y-auto rounded-xl"
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
                                    prev.map((l, i) =>
                                      i === idx
                                        ? { ...l, destination: s.iata_code, destinationSelected: s.iata_code }
                                        : l,
                                    ),
                                  );
                                  setMultiCityDestinationSuggestions((prev) =>
                                    prev.map((arr, i) => (i === idx ? [] : arr)),
                                  );
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
                      <button
                        type="button"
                        onClick={() => {
                          setMultiCityLegs((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? {
                                    ...l,
                                    origin: l.destination,
                                    destination: l.origin,
                                    originSelected: l.destinationSelected,
                                    destinationSelected: l.originSelected,
                                  }
                                : l,
                            ),
                          );
                        }}
                        aria-label={`Swap leg ${idx + 1}`}
                        className="absolute"
                        style={{
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          background: COLOR.surface2,
                          border: `1px solid ${COLOR.surfaceLine}`,
                          boxShadow: NAVY_SHADOW_CARD,
                          color: COLOR.navy,
                          display: "grid",
                          placeItems: "center",
                          zIndex: 5,
                          cursor: "pointer",
                        }}
                      >
                        <SwapIcon color={COLOR.navy} size={14} />
                      </button>
                    </div>
                    <VDiv desktopOnly />
                    <div className="relative" style={{ width: "100%", padding: "14px 20px" }}>
                      <div className="md:w-[280px]" style={{ width: "100%" }}>
                        <div style={SKY_LABEL_STYLE}>Depart</div>
                        <div
                          className="text-[19px] font-semibold pointer-events-none mt-1 truncate"
                          style={{ color: leg.date ? COLOR.navy : COLOR.mutedSoft, fontFamily: FONT_STACK }}
                        >
                          {leg.date ? formatLongDate(leg.date) : "Select date"}
                        </div>
                        <div style={{ ...SKY_CAPTION_STYLE, minHeight: 18 }} className="truncate">
                          {leg.date ? `${new Date(`${leg.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })} · flex ±2 days` : "—"}
                        </div>
                      </div>
                      <input
                        type="date"
                        value={leg.date}
                        onChange={(e) => {
                          const value = e.target.value;
                          setMultiCityLegs((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, date: value } : l)),
                          );
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
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
                            top: 12,
                            right: 12,
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            background: "#FEE2E2",
                            border: `1px solid #FCA5A5`,
                            cursor: "pointer",
                            zIndex: 6,
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

              <HDiv />
              <div style={{ padding: "12px 20px" }}>
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
                  className="inline-flex items-center"
                  style={{
                    gap: 6,
                    color: COLOR.trvlBlue,
                    fontFamily: BODY_STACK,
                    fontWeight: 500,
                    fontSize: 14,
                    opacity: multiCityLegs.length >= 5 ? 0.5 : 1,
                    cursor: multiCityLegs.length >= 5 ? "not-allowed" : "pointer",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                  }}
                >
                  <LucideIcon size={14} color={COLOR.trvlBlue}>
                    <path d="M12 5v14M5 12h14" />
                  </LucideIcon>
                  Add another flight
                </button>
              </div>

              <HDiv />
              <div className="flex flex-wrap md:flex-nowrap" style={{ alignItems: "stretch" }}>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  {renderPassengersChip()}
                </div>
                <SearchSubmit />
              </div>
            </div>
          )}

          {/* Trust strip */}
          <div
            className="flex flex-wrap items-center"
            style={{
              gap: "8px 24px",
              marginTop: 24,
              fontSize: 13,
              color: COLOR.muted,
              fontFamily: BODY_STACK,
            }}
          >
            <span className="inline-flex items-center" style={{ gap: 8 }}>
              <GreenCheckIcon /> USDT, USDC supported
            </span>
            <span className="inline-flex items-center" style={{ gap: 8 }}>
              <GreenCheckIcon /> 12-minute price lock
            </span>
            <span className="inline-flex items-center" style={{ gap: 8 }}>
              <GreenCheckIcon /> Refunds in stablecoins, same wallet
            </span>
            <span
              className="inline-flex items-center"
              style={{
                gap: 8,
                marginLeft: "auto",
                fontFamily: MONO_STACK,
                fontSize: 12,
                color: COLOR.mutedSoft,
              }}
            >
              GBP/USD&nbsp;<span style={{ color: COLOR.navy }}>1.273</span>&nbsp;· &nbsp;updated 2 min ago
            </span>
          </div>
        </div>
      </section>

      {/* ─────────── FEATURES ─────────── */}
      <section id="how" style={{ padding: "96px 0 32px" }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          <div className="flex items-end justify-between flex-wrap" style={{ gap: 24 }}>
            <div style={{ maxWidth: 640 }}>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: COLOR.trvlBlue,
                  fontWeight: 600,
                  fontFamily: BODY_STACK,
                }}
              >
                Why TRVLscan
              </div>
              <h2
                className="text-[40px] sm:text-[52px]"
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.0,
                  color: COLOR.navy,
                  marginTop: 12,
                }}
              >
                The fastest way to fly when your money is on-chain.
              </h2>
            </div>
            <p
              style={{
                maxWidth: 380,
                fontSize: 15.5,
                color: COLOR.muted,
                lineHeight: 1.6,
                fontFamily: BODY_STACK,
              }}
            >
              Three things every flight aggregator should get right — and the reason most people switch to us after one trip.
            </p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3"
            style={{ gap: 20, marginTop: 48 }}
          >
            {/* Card 1 — white */}
            <article
              style={{
                position: "relative",
                background: COLOR.surface2,
                borderRadius: 24,
                border: `1px solid ${COLOR.surfaceLine}`,
                padding: 28,
              }}
            >
              <div
                className="grid place-items-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: COLOR.trvlBlue50,
                  color: COLOR.trvlBlue,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <SearchIcon color={COLOR.trvlBlue} size={22} />
              </div>
              <h3
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                  color: COLOR.navy,
                  marginTop: 20,
                }}
              >
                One search, every airline.
              </h3>
              <p
                style={{
                  fontFamily: BODY_STACK,
                  fontSize: 14.5,
                  color: COLOR.muted,
                  lineHeight: 1.6,
                  marginTop: 10,
                }}
              >
                We check 38 carriers and major aggregators in parallel. You see the real cheapest fare — not the one a partner paid to surface.
              </p>
              <a
                href="#search"
                className="inline-flex items-center"
                style={{
                  gap: 6,
                  marginTop: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  color: COLOR.trvlBlue,
                  fontFamily: BODY_STACK,
                }}
              >
                See it run
                <ArrowRightIcon color={COLOR.trvlBlue} size={14} />
              </a>
            </article>

            {/* Card 2 — dark navy with TRVL Blue glow */}
            <article
              style={{
                position: "relative",
                background: COLOR.navy,
                color: "#FFFFFF",
                borderRadius: 24,
                padding: 28,
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: -40,
                  top: -40,
                  width: 176,
                  height: 176,
                  borderRadius: 999,
                  background: "rgba(27, 79, 255, 0.4)",
                  filter: "blur(48px)",
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: -80,
                  bottom: 0,
                  width: 224,
                  height: 224,
                  borderRadius: 999,
                  background: "rgba(79, 123, 255, 0.2)",
                  filter: "blur(48px)",
                }}
              />
              <div
                className="relative grid place-items-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#FFFFFF",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <LucideIcon size={22} color="#FFFFFF">
                  <rect x="3" y="6" width="18" height="13" rx="3" />
                  <path d="M3 10h18M7 15h3" />
                </LucideIcon>
              </div>
              <h3
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                  color: "#FFFFFF",
                  marginTop: 20,
                }}
              >
                Pay with the wallet you already use.
              </h3>
              <p
                style={{
                  fontFamily: BODY_STACK,
                  fontSize: 14.5,
                  color: "rgba(255, 255, 255, 0.75)",
                  lineHeight: 1.6,
                  marginTop: 10,
                }}
              >
                USDT on Tron, USDC on Solana, USDT on Ethereum — same QR flow. No card, no 3-D Secure, no &ldquo;your bank declined this airline&rdquo; at 11&nbsp;PM.
              </p>
              <div
                className="relative flex items-center"
                style={{
                  marginTop: 24,
                  gap: 12,
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <div
                  className="grid place-items-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: COLOR.usdtGreen,
                    color: "#FFFFFF",
                    fontFamily: MONO_STACK,
                    fontWeight: 700,
                    fontSize: 14,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  ₮
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.7)", fontFamily: BODY_STACK }}>
                    Send to TRC-20 address
                  </div>
                  <div
                    className="truncate"
                    style={{ fontFamily: MONO_STACK, fontSize: 13, color: "#FFFFFF" }}
                  >
                    TQrZ8…dN9f4kE
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontFamily: MONO_STACK,
                    color: COLOR.usdtGreenLight,
                    background: "rgba(15, 169, 88, 0.3)",
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  paid
                </span>
              </div>
            </article>

            {/* Card 3 — light blue surface */}
            <article
              style={{
                position: "relative",
                background: COLOR.trvlBlue50,
                borderRadius: 24,
                border: `1px solid ${COLOR.surfaceLine}`,
                padding: 28,
              }}
            >
              <div
                className="grid place-items-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: COLOR.surface2,
                  color: COLOR.navy,
                  border: `1px solid ${COLOR.surfaceLine}`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <LucideIcon size={22} color={COLOR.navy}>
                  <path d="M12 22s8-7 8-13a8 8 0 0 0-16 0c0 6 8 13 8 13Z" />
                  <path d="m9 11 2 2 4-4" />
                </LucideIcon>
              </div>
              <h3
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                  color: COLOR.navy,
                  marginTop: 20,
                }}
              >
                Real ticket, real airline, real PNR.
              </h3>
              <p
                style={{
                  fontFamily: BODY_STACK,
                  fontSize: 14.5,
                  color: COLOR.muted,
                  lineHeight: 1.6,
                  marginTop: 10,
                }}
              >
                Issued through Duffel and IATA-licensed partners. Check in at the airline counter like anyone else. Refunds go back to the same wallet, in stablecoins.
              </p>
              <ul style={{ marginTop: 20, fontSize: 13.5, color: COLOR.navySoft, fontFamily: BODY_STACK }}>
                {[
                  "IATA-issued PNR within 90 seconds",
                  "24/7 human support — Telegram or email",
                  "Cancel within 24h for a full stablecoin refund",
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-center"
                    style={{ gap: 8, marginTop: 8 }}
                  >
                    <GreenCheckIcon />
                    {line}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ─────────── DESTINATIONS ─────────── */}
      <section style={{ padding: "96px 0" }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          <div
            className="flex items-end justify-between flex-wrap"
            style={{ gap: 24, marginBottom: 40 }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: COLOR.trvlBlue,
                  fontWeight: 600,
                  fontFamily: BODY_STACK,
                }}
              >
                Popular right now
              </div>
              <h2
                className="text-[40px] sm:text-[52px]"
                style={{
                  fontFamily: FONT_STACK,
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.0,
                  color: COLOR.navy,
                  marginTop: 12,
                }}
              >
                Where everyone&apos;s flying this month.
              </h2>
            </div>
            <div className="flex items-center" style={{ gap: 8, fontSize: 13, color: COLOR.muted }}>
              <span style={{ fontFamily: BODY_STACK }}>Showing {DESTINATIONS.length} of 142</span>
              <a
                href="#"
                className="inline-flex items-center"
                style={{
                  gap: 6,
                  color: COLOR.navy,
                  fontWeight: 500,
                  fontFamily: BODY_STACK,
                }}
              >
                View all destinations
                <ArrowRightIcon color={COLOR.navy} size={14} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: 16 }}>
            {DESTINATIONS.map((d, i) => (
              <button
                key={`${d.origin}-${d.destination}-${i}`}
                type="button"
                onClick={() => handleDestinationClick(d.origin, d.destination)}
                className="text-left transition-transform hover:-translate-y-0.5 group"
                style={{
                  background: COLOR.surface2,
                  borderRadius: 24,
                  border: `1px solid ${COLOR.surfaceLine}`,
                  overflow: "hidden",
                  cursor: "pointer",
                  transitionDuration: "180ms",
                }}
              >
                <div
                  className="relative"
                  style={{
                    aspectRatio: "4 / 5",
                    background: `linear-gradient(180deg, ${d.bg} 0%, ${d.dark} 100%)`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0"
                    style={{ height: "55%" }}
                  >
                    <DestinationArt icon={d.icon} dark={d.dark} />
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      height: "38%",
                      background: "linear-gradient(180deg, transparent, rgba(10,27,61,0.22))",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    className="absolute flex items-center justify-between"
                    style={{
                      top: 16,
                      left: 16,
                      right: 16,
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(255, 255, 255, 0.92)",
                      fontWeight: 500,
                      fontFamily: BODY_STACK,
                    }}
                  >
                    <span>{d.region}</span>
                    <span style={{ fontFamily: MONO_STACK }}>{d.coords}</span>
                  </div>
                </div>
                <div
                  className="flex items-end justify-between"
                  style={{ padding: "14px 16px" }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: FONT_STACK,
                        fontWeight: 700,
                        fontSize: 18,
                        letterSpacing: "-0.01em",
                        color: COLOR.navy,
                      }}
                    >
                      {d.city}
                    </div>
                    <div
                      style={{
                        fontFamily: BODY_STACK,
                        fontSize: 12.5,
                        color: COLOR.mutedSoft,
                      }}
                    >
                      {d.origin} → {d.destination}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      style={{
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: COLOR.mutedSoft,
                        fontFamily: MONO_STACK,
                      }}
                    >
                      from
                    </div>
                    <div
                      style={{
                        fontFamily: MONO_STACK,
                        fontSize: 15,
                        fontWeight: 600,
                        color: COLOR.navy,
                      }}
                    >
                      {d.price} USDT
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <section
        id="faq"
        style={{
          background: COLOR.surface2,
          borderTop: `1px solid ${COLOR.surfaceLine}`,
          borderBottom: `1px solid ${COLOR.surfaceLine}`,
          padding: "112px 0",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          <div
            className="grid grid-cols-1 lg:grid-cols-12"
            style={{ gap: 64 }}
          >
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <div
                  style={{
                    fontFamily: MONO_STACK,
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    color: COLOR.trvlBlue,
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  § 04 · Questions
                </div>
                <h2
                  className="text-[40px] lg:text-[52px]"
                  style={{
                    fontFamily: FONT_STACK,
                    fontWeight: 800,
                    letterSpacing: "-0.035em",
                    lineHeight: 1,
                    color: COLOR.navy,
                    marginBottom: 24,
                  }}
                >
                  The questions everyone sensibly asks first.
                </h2>
                <p
                  style={{
                    fontFamily: BODY_STACK,
                    fontSize: 15,
                    color: COLOR.navyTint,
                    maxWidth: 360,
                    lineHeight: 1.55,
                  }}
                >
                  Don&apos;t see yours?{" "}
                  <a
                    href="mailto:hello@trvlscan.com"
                    style={{ color: COLOR.trvlBlue, fontWeight: 500 }}
                  >
                    Email support
                  </a>{" "}
                  — a human replies within an hour during European working time.
                </p>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div style={{ borderTop: `1px solid ${COLOR.surfaceLine}` }}>
                {FAQS.map((item, i) => {
                  const open = openFaq === i;
                  return (
                    <div
                      key={item.q}
                      style={{ borderBottom: `1px solid ${COLOR.surfaceLine}` }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? null : i)}
                        aria-expanded={open}
                        className="w-full text-left flex items-start"
                        style={{
                          gap: 24,
                          padding: "24px 0",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: MONO_STACK,
                            fontSize: 12,
                            color: COLOR.navyTint,
                            paddingTop: 4,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {`Q.${String(i + 1).padStart(2, "0")}`}
                        </span>
                        <span
                          className="flex-1"
                          style={{
                            fontFamily: FONT_STACK,
                            fontWeight: 700,
                            fontSize: 19,
                            letterSpacing: "-0.025em",
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
                            color: COLOR.navyTint,
                            marginTop: 6,
                          }}
                        >
                          <LucideIcon size={20} color={COLOR.navyTint}>
                            <path d="m6 9 6 6 6-6" />
                          </LucideIcon>
                        </span>
                      </button>
                      {open && (
                        <div
                          style={{
                            paddingLeft: 52,
                            paddingBottom: 24,
                            marginTop: -4,
                            fontFamily: BODY_STACK,
                            fontSize: 15,
                            color: COLOR.navyTint,
                            lineHeight: 1.65,
                            maxWidth: 640,
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
          </div>
        </div>
      </section>

      {/* ─────────── FINAL CTA ─────────── */}
      <section style={{ padding: "112px 0" }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 32px" }}>
          <div
            className="relative"
            style={{
              borderRadius: 32,
              overflow: "hidden",
              background: COLOR.navy,
              color: "#FFFFFF",
              padding: "80px 64px",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -128,
                right: -96,
                width: 520,
                height: 520,
                borderRadius: 999,
                background: "rgba(27, 79, 255, 0.35)",
                filter: "blur(48px)",
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: -160,
                left: -128,
                width: 460,
                height: 460,
                borderRadius: 999,
                background: "rgba(79, 123, 255, 0.25)",
                filter: "blur(48px)",
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: "33%",
                background: "linear-gradient(180deg, #0033C1 0%, transparent 100%)",
                opacity: 0.45,
                pointerEvents: "none",
              }}
            />

            <div
              className="relative grid lg:grid-cols-12"
              style={{ gap: 40, alignItems: "end" }}
            >
              <div className="lg:col-span-8">
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: COLOR.trvlBlueLight,
                    fontWeight: 600,
                    fontFamily: BODY_STACK,
                  }}
                >
                  Ready when you are
                </div>
                <h2
                  className="text-[44px] sm:text-[64px]"
                  style={{
                    fontFamily: FONT_STACK,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    lineHeight: 0.98,
                    marginTop: 12,
                  }}
                >
                  Pick a destination.
                  <br />
                  Send a few{" "}
                  <span
                    style={{
                      backgroundImage:
                        "linear-gradient(transparent 62%, rgba(15, 169, 88, 0.32) 62%, rgba(15, 169, 88, 0.32) 92%, transparent 92%)",
                      backgroundRepeat: "no-repeat",
                      padding: "0 0.05em",
                    }}
                  >
                    USDT
                  </span>
                  .
                  <br />
                  Get on the plane.
                </h2>
                <p
                  style={{
                    marginTop: 24,
                    maxWidth: 520,
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: "rgba(255, 255, 255, 0.75)",
                    fontFamily: BODY_STACK,
                  }}
                >
                  No card. No bank declines. No &ldquo;your travel agent will email you a confirmation in 24 hours&rdquo;. A real ticket, in your inbox, in under two minutes.
                </p>
              </div>
              <div
                className="lg:col-span-4 flex flex-col"
                style={{ gap: 12 }}
              >
                <a
                  href="#search"
                  className="inline-flex items-center justify-center"
                  style={{
                    gap: 8,
                    height: 48,
                    padding: "0 20px",
                    borderRadius: 12,
                    background: COLOR.trvlBlue,
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily: BODY_STACK,
                    boxShadow: TRVL_POP_SHADOW,
                  }}
                >
                  Start a search
                  <ArrowRightIcon color="#FFFFFF" size={14} />
                </a>
                <a
                  href="#how"
                  className="inline-flex items-center justify-center"
                  style={{
                    gap: 8,
                    height: 48,
                    padding: "0 20px",
                    borderRadius: 12,
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 500,
                    fontFamily: BODY_STACK,
                  }}
                >
                  See how it works
                </a>
                <span
                  className="inline-flex items-center self-center"
                  style={{
                    marginTop: 4,
                    gap: 8,
                    fontSize: 12.5,
                    color: "rgba(255, 255, 255, 0.65)",
                    fontFamily: BODY_STACK,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 6, height: 6, borderRadius: 999, background: COLOR.usdtGreen }}
                  />
                  <span style={{ fontFamily: MONO_STACK }}>All systems operational</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer style={{ background: COLOR.navy, color: "#FFFFFF" }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "80px 32px" }}>
          <div className="grid grid-cols-2 md:grid-cols-12" style={{ gap: 40 }}>
            <div className="col-span-2 md:col-span-5">
              <div className="flex items-center" style={{ gap: 10, marginBottom: 20 }}>
                <span
                  aria-hidden="true"
                  className="grid place-items-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#FFFFFF",
                    color: COLOR.navy,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <PaperPlaneIcon size={14} color={COLOR.navy} />
                </span>
                <span
                  style={{
                    fontFamily: FONT_STACK,
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: "-0.025em",
                  }}
                >
                  TRVLscan
                </span>
              </div>
              <p
                style={{
                  fontSize: 15,
                  color: "rgba(255, 255, 255, 0.65)",
                  maxWidth: 380,
                  lineHeight: 1.6,
                  fontFamily: BODY_STACK,
                }}
              >
                A flight aggregator that quotes in stablecoin. Built for the people stablecoins were always supposed to serve.
              </p>
              <div
                className="inline-flex items-center"
                style={{
                  marginTop: 32,
                  gap: 8,
                  fontFamily: MONO_STACK,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: COLOR.usdtGreenLight,
                  background: "rgba(15, 169, 88, 0.15)",
                  border: "1px solid rgba(15, 169, 88, 0.3)",
                  borderRadius: 999,
                  padding: "6px 12px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: 999, background: COLOR.usdtGreen }}
                />
                ALL SYSTEMS OPERATIONAL · UPTIME 99.97%
              </div>
            </div>

            {[
              {
                heading: "Product",
                items: ["Flight search", "Multi-city", "Pricing", "Status"],
              },
              {
                heading: "Payments",
                items: ["USDT (TRC-20)", "Networks", "Refund policy", "FX rates"],
              },
              {
                heading: "Company",
                items: ["About", "Press kit", "Contact support", "Privacy & terms"],
              },
            ].map((col, idx) => (
              <div
                key={col.heading}
                className={idx === 2 ? "md:col-span-3" : "md:col-span-2"}
              >
                <div
                  style={{
                    fontFamily: MONO_STACK,
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    color: "rgba(255, 255, 255, 0.4)",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  {col.heading}
                </div>
                <ul
                  style={{
                    fontSize: 14,
                    color: "rgba(255, 255, 255, 0.8)",
                    fontFamily: BODY_STACK,
                  }}
                >
                  {col.items.map((line) => (
                    <li key={line} style={{ marginTop: 10, listStyle: "none" }}>
                      <a href="#" style={{ color: "inherit" }}>
                        {line}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="flex flex-wrap items-center justify-between"
            style={{
              marginTop: 64,
              paddingTop: 32,
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: 12,
              fontFamily: MONO_STACK,
              color: "rgba(255, 255, 255, 0.45)",
              fontVariantNumeric: "tabular-nums",
              gap: 16,
            }}
          >
            <div>© 2026 TRVLscan Ltd · Companies House 14829203</div>
            <div className="flex items-center" style={{ gap: 20 }}>
              <span>v 1.4.2</span>
              <span>·</span>
              <span>BUILD a3f9c10</span>
              <span>·</span>
              <span>EU / UK</span>
            </div>
          </div>
        </div>
      </footer>

      {/* PULSE ANIMATION */}
      <style jsx global>{`
        @keyframes trvl-pulse {
          0% { transform: scale(0.7); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .trvl-pulse {
          animation: trvl-pulse 2s ease-out infinite;
        }
      `}</style>
    </main>
  );
}
