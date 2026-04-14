"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OfferRecord = Record<string, unknown>;

function readValue(offer: OfferRecord, paths: string[], fallback = "-") {
  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = offer;

    for (const part of parts) {
      if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }

    if (typeof current === "string" && current.trim()) {
      return current;
    }

    if (typeof current === "number" && Number.isFinite(current)) {
      return String(current);
    }
  }

  return fallback;
}

function readNumber(offer: OfferRecord, paths: string[], fallback = 0) {
  for (const path of paths) {
    const value = readValue(offer, [path], "");
    if (value === "") {
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(value: string) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(value.trim());
  if (!match) {
    return value;
  }

  const hours = match[1] ? `${match[1]}h` : "";
  const minutes = match[2] ? `${match[2]}m` : "";
  return [hours, minutes].filter(Boolean).join(" ") || "0m";
}

function getAirlineInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "-") {
    return "FL";
  }

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDateTabLabel(date: Date) {
  return date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function buildDateWindow(baseDateString: string) {
  const parsedDate = new Date(baseDateString);
  const baseDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const result: { key: string; label: string; isoDate: string }[] = [];

  for (let offset = -3; offset <= 3; offset += 1) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + offset);
    const isoDate = date.toISOString().slice(0, 10);
    result.push({
      key: `${isoDate}-${offset}`,
      label: formatDateTabLabel(date),
      isoDate,
    });
  }

  return result;
}

function getPriceInUsdt(totalAmount: number, gbpUsdRate: number | null) {
  if (gbpUsdRate === null) {
    return totalAmount;
  }
  return totalAmount * gbpUsdRate * 1.025;
}

function getDurationMinutes(value: string) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(value.trim());
  if (!match) {
    return 0;
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  return hours * 60 + minutes;
}

const DATE_PRICE_MULTIPLIERS: Record<number, number> = {
  [-3]: 1.12,
  [-2]: 1.07,
  [-1]: 1.03,
  0: 1,
  1: 1.04,
  2: 1.08,
  3: 1.15,
};

export default function ResultsPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [searchInfo, setSearchInfo] = useState<{
    origin: string;
    destination: string;
    departure_date: string;
    passengers: number;
  } | null>(null);
  const [gbpUsdRate, setGbpUsdRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [selectingOfferId, setSelectingOfferId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStops, setSelectedStops] = useState<number[]>([]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [maxPriceFilter, setMaxPriceFilter] = useState(0);
  const [departureHourLimit, setDepartureHourLimit] = useState(24);
  const [maxDurationHours, setMaxDurationHours] = useState(1);
  const [sortBy, setSortBy] = useState<"best" | "shortest" | "departure" | "arrival">("best");

  useEffect(() => {
    const rawOffers = sessionStorage.getItem("searchOffers");
    const rawSearchParams = sessionStorage.getItem("searchParams");

    if (rawOffers) {
      try {
        const parsedOffers = JSON.parse(rawOffers);
        setOffers(Array.isArray(parsedOffers) ? (parsedOffers as OfferRecord[]) : []);
      } catch {
        setOffers([]);
      }
    }

    if (rawSearchParams) {
      try {
        const parsedParams = JSON.parse(rawSearchParams) as {
          origin?: string;
          destination?: string;
          departure_date?: string;
          passengers?: number;
        };
        setSearchInfo({
          origin: parsedParams.origin ?? "-",
          destination: parsedParams.destination ?? "-",
          departure_date: parsedParams.departure_date ?? "-",
          passengers: Number(parsedParams.passengers ?? 1),
        });
        setSelectedDate(parsedParams.departure_date ?? "");
      } catch {
        setSearchInfo(null);
      }
    }
  }, []);

  const dateOptions = useMemo(
    () => buildDateWindow(selectedDate || searchInfo?.departure_date || ""),
    [searchInfo?.departure_date, selectedDate],
  );
  const activeDate = selectedDate || dateOptions[3]?.isoDate || "";

  const normalizedOffers = useMemo(() => {
    return offers.map((offer, index) => {
      const airline = readValue(offer, [
        "airline.name",
        "airline_name",
        "airline",
        "carrier",
        "itinerary.airline_name",
      ]);
      const departureTime = readValue(offer, [
        "departure_time",
        "departure",
        "outbound.departure_time",
        "itinerary.departure_time",
      ]);
      const arrivalTime = readValue(offer, [
        "arrival_time",
        "arrival",
        "outbound.arrival_time",
        "itinerary.arrival_time",
      ]);
      const duration = readValue(offer, ["duration", "flight_duration", "itinerary.duration"]);
      const stopsRaw = readValue(offer, ["number_of_stops", "stops", "itinerary.stops"], "0");
      const totalAmount = readNumber(offer, [
        "total_amount",
        "price",
        "price_total",
        "fare.total_amount",
      ]);
      const totalCurrency = readValue(offer, ["total_currency", "currency"], "GBP");
      const offerId = readValue(offer, ["id"], "");
      const airlineIata = readValue(offer, [
        "owner.iata_code",
        "slices.0.segments.0.marketing_carrier.iata_code",
        "slices.0.segments.0.operating_carrier.iata_code",
        "airline_iata",
        "iata_code",
      ]);
      const departureDate = new Date(departureTime);
      const departureDateIso = Number.isNaN(departureDate.getTime())
        ? activeDate
        : departureDate.toISOString().slice(0, 10);
      const departureHour = Number.isNaN(departureDate.getTime()) ? 0 : departureDate.getHours();
      const arrivalDate = new Date(arrivalTime);
      const arrivalMinutes = Number.isNaN(arrivalDate.getTime())
        ? Number.MAX_SAFE_INTEGER
        : arrivalDate.getHours() * 60 + arrivalDate.getMinutes();
      const durationMinutes = getDurationMinutes(duration);
      const durationHours = Math.max(1, Math.ceil(durationMinutes / 60));
      const numericStops = Number(stopsRaw);
      const stops = Number.isFinite(numericStops) ? Math.max(0, numericStops) : 0;
      const stopLabel = stops <= 0 ? "Nonstop" : `${stops} ${stops === 1 ? "stop" : "stops"}`;
      const usdtPrice = getPriceInUsdt(totalAmount, gbpUsdRate);
      const baggageValue = readValue(
        offer,
        ["conditions.change_before_departure", "baggage"],
        "",
      ).toLowerCase();
      const hasCheckedBag =
        baggageValue.includes("checked") ||
        baggageValue.includes("include") ||
        baggageValue.includes("1pc");

      return {
        offer,
        key: offerId || `${airline}-${departureTime}-${arrivalTime}-${index}`,
        offerId,
        airline,
        departureTime,
        arrivalTime,
        duration,
        durationMinutes,
        durationHours,
        stops,
        stopLabel,
        totalAmount,
        totalCurrency,
        usdtPrice,
        airlineIata: airlineIata === "-" ? "-" : airlineIata.toUpperCase().slice(0, 2),
        departureHour,
        arrivalMinutes,
        departureDateIso,
        hasCheckedBag,
      };
    });
  }, [activeDate, gbpUsdRate, offers]);

  const uniqueStopOptions = useMemo(() => {
    const values = Array.from(new Set(normalizedOffers.map((item) => item.stops)));
    return values.sort((a, b) => a - b);
  }, [normalizedOffers]);

  const uniqueAirlineOptions = useMemo(() => {
    const values = Array.from(new Set(normalizedOffers.map((item) => item.airline)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [normalizedOffers]);

  const minPrice = useMemo(() => {
    if (normalizedOffers.length === 0) {
      return 0;
    }
    return Math.floor(Math.min(...normalizedOffers.map((item) => item.usdtPrice)));
  }, [normalizedOffers]);

  const maxPrice = useMemo(() => {
    if (normalizedOffers.length === 0) {
      return 0;
    }
    return Math.ceil(Math.max(...normalizedOffers.map((item) => item.usdtPrice)));
  }, [normalizedOffers]);

  const maxDurationAvailable = useMemo(() => {
    if (normalizedOffers.length === 0) {
      return 1;
    }
    return Math.max(1, ...normalizedOffers.map((item) => item.durationHours));
  }, [normalizedOffers]);

  useEffect(() => {
    setSelectedStops(uniqueStopOptions);
  }, [uniqueStopOptions]);

  useEffect(() => {
    setSelectedAirlines(uniqueAirlineOptions);
  }, [uniqueAirlineOptions]);

  useEffect(() => {
    setMaxPriceFilter(maxPrice);
  }, [maxPrice]);

  useEffect(() => {
    setMaxDurationHours(maxDurationAvailable);
  }, [maxDurationAvailable]);

  const stopMinPriceMap = useMemo(() => {
    const map = new Map<number, number>();
    uniqueStopOptions.forEach((stopCount) => {
      const stopPrices = normalizedOffers
        .filter((item) => item.stops === stopCount)
        .map((item) => item.usdtPrice);
      if (stopPrices.length > 0) {
        map.set(stopCount, Math.min(...stopPrices));
      }
    });
    return map;
  }, [normalizedOffers, uniqueStopOptions]);

  const airlineMinPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    uniqueAirlineOptions.forEach((airline) => {
      const prices = normalizedOffers.filter((item) => item.airline === airline).map((item) => item.usdtPrice);
      if (prices.length > 0) {
        map.set(airline, Math.min(...prices));
      }
    });
    return map;
  }, [normalizedOffers, uniqueAirlineOptions]);

  const dateMinPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    dateOptions.forEach((option) => {
      const prices = normalizedOffers
        .filter((item) => item.departureDateIso === option.isoDate)
        .map((item) => item.usdtPrice);
      if (prices.length > 0) {
        map.set(option.isoDate, Math.min(...prices));
      }
    });
    return map;
  }, [dateOptions, normalizedOffers]);

  const cheapestDatePrice = useMemo(() => {
    const allPrices = Array.from(dateMinPriceMap.values());
    if (allPrices.length === 0) {
      return null;
    }
    return Math.min(...allPrices);
  }, [dateMinPriceMap]);

  const currentMinUsdtPrice = useMemo(() => {
    if (normalizedOffers.length === 0) {
      return null;
    }
    return Math.min(...normalizedOffers.map((item) => item.usdtPrice));
  }, [normalizedOffers]);

  const filteredOffers = useMemo(() => {
    return normalizedOffers.filter((item) => {
      if (activeDate && item.departureDateIso !== activeDate) {
        return false;
      }
      if (!selectedStops.includes(item.stops)) {
        return false;
      }
      if (!selectedAirlines.includes(item.airline)) {
        return false;
      }
      if (item.usdtPrice > maxPriceFilter) {
        return false;
      }
      if (item.departureHour > departureHourLimit) {
        return false;
      }
      if (item.durationHours > maxDurationHours) {
        return false;
      }
      return true;
    });
  }, [
    activeDate,
    departureHourLimit,
    maxDurationHours,
    maxPriceFilter,
    normalizedOffers,
    selectedAirlines,
    selectedStops,
  ]);

  const sortedOffers = useMemo(() => {
    const items = [...filteredOffers];
    items.sort((a, b) => {
      if (sortBy === "shortest") {
        return a.durationMinutes - b.durationMinutes;
      }
      if (sortBy === "departure") {
        return a.departureHour - b.departureHour;
      }
      if (sortBy === "arrival") {
        return a.arrivalMinutes - b.arrivalMinutes;
      }
      return a.usdtPrice - b.usdtPrice;
    });
    return items;
  }, [filteredOffers, sortBy]);

  const cheapestVisiblePrice = useMemo(() => {
    if (sortedOffers.length === 0) {
      return null;
    }
    return Math.min(...sortedOffers.map((item) => item.usdtPrice));
  }, [sortedOffers]);

  const toggleStop = (value: number) => {
    setSelectedStops((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleAirline = (value: string) => {
    setSelectedAirlines((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const sortOptions: { key: "best" | "shortest" | "departure" | "arrival"; label: string }[] = [
    { key: "best", label: "Best Price" },
    { key: "shortest", label: "Shortest" },
    { key: "departure", label: "Departure" },
    { key: "arrival", label: "Arrival" },
  ];

  const handleSelect = (offer: OfferRecord) => {
    const offerId = readValue(offer, ["id"], "");
    if (!offerId) {
      return;
    }

    setSelectingOfferId(offerId);
    sessionStorage.setItem("selectedOffer", JSON.stringify(offer));
    router.push("/passenger");
  };

  useEffect(() => {
    const from = "GBP";
    const to = "USD";
    const cacheKey = `currencyRate_${from}_${to}`;
    const cachedRate = sessionStorage.getItem(cacheKey);
    if (cachedRate) {
      const parsedRate = Number(cachedRate);
      if (Number.isFinite(parsedRate) && parsedRate > 0) {
        setGbpUsdRate(parsedRate);
        setIsRateLoading(false);
        return;
      }
    }

    let isCancelled = false;

    async function fetchRate() {
      setIsRateLoading(true);
      try {
        const response = await fetch(
          "https://trvlscan-backend-production.up.railway.app/api/currency/rate?from=GBP&to=USD",
        );
        if (!response.ok) {
          throw new Error("Failed to fetch GBP/USD rate");
        }

        const payload = (await response.json()) as { rate?: number };
        const usdRate = Number(payload.rate);
        if (Number.isFinite(usdRate) && usdRate > 0 && !isCancelled) {
          setGbpUsdRate(usdRate);
          sessionStorage.setItem(cacheKey, String(usdRate));
        }
      } catch {
        if (!isCancelled) {
          setGbpUsdRate(null);
        }
      } finally {
        if (!isCancelled) {
          setIsRateLoading(false);
        }
      }
    }

    fetchRate();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#F0F4F9] px-4 py-8 text-[#0B1F3A] md:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="w-full rounded-2xl border border-[#E2EAF4] bg-white px-4 py-3 text-sm text-slate-500">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <span className="font-semibold text-[#0B1F3A]">
              {searchInfo?.origin ?? "-"} <span className="mx-1 text-slate-400">→</span>{" "}
              {searchInfo?.destination ?? "-"}
            </span>
            <span className="text-slate-300">|</span>
            <span>{searchInfo?.departure_date ?? "-"}</span>
            <span className="text-slate-300">|</span>
            <span>{searchInfo?.passengers ?? 1} passenger(s)</span>
            <span className="rounded-full bg-[#DBEAFE] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
              One Way
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2 pb-1">
            {dateOptions.map((dateOption) => {
              const offsetFromCenter = dateOptions.findIndex((option) => option.key === dateOption.key) - 3;
              const date = new Date(dateOption.isoDate);
              const isSelected = dateOption.isoDate === activeDate;
              const minDatePrice = dateMinPriceMap.get(dateOption.isoDate);
              const isCheapestDate =
                cheapestDatePrice !== null &&
                minDatePrice !== undefined &&
                Math.abs(minDatePrice - cheapestDatePrice) < 0.01;
              const isCenterDate = offsetFromCenter === 0;
              const priceMultiplier = DATE_PRICE_MULTIPLIERS[offsetFromCenter] ?? 1;
              const tabPrice =
                currentMinUsdtPrice === null ? undefined : Math.max(0, currentMinUsdtPrice * priceMultiplier);
              const hasRenderablePrice = !isRateLoading && tabPrice !== undefined;

              return (
                <button
                  key={dateOption.key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(dateOption.isoDate);
                  }}
                  className={`min-w-[112px] rounded-xl border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-[#2563EB] bg-[#DBEAFE]"
                      : "border-[#E2EAF4] bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs text-slate-400">
                    {date.toLocaleDateString([], { weekday: "short" })}
                  </p>
                  <p className="text-[13px] font-semibold text-[#0B1F3A]">
                    {date.toLocaleDateString([], { month: "short", day: "numeric" })}
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      !hasRenderablePrice
                        ? "text-slate-500"
                        : isCenterDate
                          ? isCheapestDate
                            ? "text-emerald-600"
                            : "text-slate-500"
                          : "text-slate-400"
                    }`}
                  >
                    {!hasRenderablePrice
                      ? "--"
                      : `${isCenterDate ? "" : "~"}${tabPrice.toFixed(2)} USDT`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[14rem,minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#E2EAF4] bg-white p-4 lg:sticky lg:top-6">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500">STOPS</p>
              <div className="mt-2 space-y-2">
                {uniqueStopOptions.map((stop) => {
                  const label = stop === 0 ? "Nonstop" : `${stop} stop${stop > 1 ? "s" : ""}`;
                  const minStopPrice = stopMinPriceMap.get(stop);
                  return (
                    <label key={stop} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStops.includes(stop)}
                          onChange={() => {
                            toggleStop(stop);
                          }}
                          className="h-4 w-4 rounded border-[#E2EAF4] text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <span>{label}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {minStopPrice !== undefined ? `${minStopPrice.toFixed(0)} USDT` : "--"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold tracking-wide text-slate-500">PRICE (USDT)</p>
              <p className="mt-1 text-sm text-slate-500">
                Up to <span className="font-semibold text-[#0B1F3A]">{maxPriceFilter} USDT</span>
              </p>
              <input
                type="range"
                min={minPrice}
                max={Math.max(minPrice, maxPrice)}
                value={maxPriceFilter}
                onChange={(event) => {
                  setMaxPriceFilter(Number(event.target.value));
                }}
                className="mt-2 w-full accent-[#2563EB]"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold tracking-wide text-slate-500">DEPARTURE TIME</p>
              <p className="mt-1 text-sm text-slate-500">
                00:00 - <span className="font-semibold text-[#0B1F3A]">{departureHourLimit}:00</span>
              </p>
              <input
                type="range"
                min={0}
                max={24}
                value={departureHourLimit}
                onChange={(event) => {
                  setDepartureHourLimit(Number(event.target.value));
                }}
                className="mt-2 w-full accent-[#2563EB]"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold tracking-wide text-slate-500">AIRLINES</p>
              <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
                {uniqueAirlineOptions.map((airline) => {
                  const minAirlinePrice = airlineMinPriceMap.get(airline);
                  return (
                    <label key={airline} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedAirlines.includes(airline)}
                          onChange={() => {
                            toggleAirline(airline);
                          }}
                          className="h-4 w-4 rounded border-[#E2EAF4] text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <span className="truncate">{airline}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {minAirlinePrice !== undefined ? `${minAirlinePrice.toFixed(0)} USDT` : "--"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold tracking-wide text-slate-500">DURATION</p>
              <p className="mt-1 text-sm text-slate-500">
                Up to <span className="font-semibold text-[#0B1F3A]">{maxDurationHours}h</span>
              </p>
              <input
                type="range"
                min={1}
                max={Math.max(1, maxDurationAvailable)}
                value={maxDurationHours}
                onChange={(event) => {
                  setMaxDurationHours(Number(event.target.value));
                }}
                className="mt-2 w-full accent-[#2563EB]"
              />
            </div>
          </aside>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => {
                  const isActive = sortBy === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setSortBy(option.key);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        isActive
                          ? "border-[#2563EB] bg-[#2563EB] text-white"
                          : "border-[#E2EAF4] bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-slate-500">{sortedOffers.length} flights found</p>
            </div>

            {sortedOffers.length === 0 ? (
              <div className="rounded-2xl border border-[#E2EAF4] bg-white p-6 text-sm text-slate-500">
                No flights found
              </div>
            ) : (
              <div className="space-y-3">
                {sortedOffers.map((item) => {
                  const airlineInitials = getAirlineInitials(item.airline);
                  const logoUrl = item.airlineIata && item.airlineIata !== "-"
                    ? `https://www.gstatic.com/flights/airline_logos/70px/${item.airlineIata}.png`
                    : "";
                  const isSelecting = selectingOfferId === item.offerId;
                  const isCheapest =
                    cheapestVisiblePrice !== null && Math.abs(item.usdtPrice - cheapestVisiblePrice) < 0.01;
                  const hasNonstop = item.stops === 0;

                  return (
                    <article
                      key={item.key}
                      className="rounded-2xl border border-[#E2EAF4] bg-white p-4 transition hover:border-slate-300"
                    >
                      <div className="mb-3 flex flex-wrap gap-2">
                        {isCheapest && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Cheapest
                          </span>
                        )}
                        {hasNonstop && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                            Nonstop
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3 lg:w-[16%]">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2EAF4] bg-white">
                            {logoUrl ? (
                              <>
                                <img
                                  src={logoUrl}
                                  alt={item.airline}
                                  width={28}
                                  height={28}
                                  className="h-7 w-7 object-contain"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                    const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (fallback) {
                                      fallback.style.display = "flex";
                                    }
                                  }}
                                />
                                <span className="hidden h-7 w-7 items-center justify-center rounded-full bg-[#DBEAFE] text-[10px] font-semibold text-[#2563EB]">
                                  {airlineInitials}
                                </span>
                              </>
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DBEAFE] text-[10px] font-semibold text-[#2563EB]">
                                {airlineInitials}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm font-semibold text-[#0B1F3A]">{item.airline}</p>
                        </div>

                        <div className="lg:w-[54%]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-2xl font-bold text-[#0B1F3A]">{formatTime(item.departureTime)}</p>
                            <div className="flex min-w-[130px] items-center gap-2 text-slate-400">
                              <div className="h-px flex-1 bg-slate-300" />
                              <span className="text-xs font-medium text-slate-500">
                                {formatDuration(item.duration)} • {item.stopLabel}
                              </span>
                              <div className="h-px flex-1 bg-slate-300" />
                            </div>
                            <p className="text-2xl font-bold text-[#0B1F3A]">{formatTime(item.arrivalTime)}</p>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {searchInfo?.origin ?? "-"} → {searchInfo?.destination ?? "-"}
                          </p>
                          <div className="mt-2">
                            {item.hasCheckedBag ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                Checked bag incl.
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                Carry-on only
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="lg:w-[20%] lg:text-right">
                          <p className="text-3xl font-bold text-[#2563EB]">
                            {isRateLoading ? "..." : `${item.usdtPrice.toFixed(2)} USDT`}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.totalAmount.toFixed(2)} {item.totalCurrency}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelect(item.offer);
                            }}
                            disabled={isSelecting}
                            className="mt-3 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isSelecting ? "Continuing..." : "Select →"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
