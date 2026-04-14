"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "@/lib/api";

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

  for (let offset = -2; offset <= 2; offset += 1) {
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
  const [bookingLoadingOfferId, setBookingLoadingOfferId] = useState<string | null>(null);
  const [bookingErrorByOfferId, setBookingErrorByOfferId] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string>("");

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
  const activeDate = selectedDate || dateOptions[2]?.isoDate || "";

  const handleSelect = async (offer: OfferRecord) => {
    const offerId = readValue(offer, ["id"], "");
    if (!offerId) {
      return;
    }

    setBookingLoadingOfferId(offerId);
    setBookingErrorByOfferId((prev) => ({ ...prev, [offerId]: "" }));

    try {
      const booking = (await createBooking({
        offerId,
        passengerName: "Test User",
        passengerEmail: "test@test.com",
        passengerDob: "1990-01-15",
      })) as {
        booking_id: string;
        usd_amount?: number;
        usdt_amount?: number;
        expires_at?: string;
      };

      const payload = {
        ...booking,
        selected_offer: offer,
        search_params: searchInfo,
      };
      sessionStorage.setItem("currentBooking", JSON.stringify(payload));
      router.push(`/booking/${booking.booking_id}`);
    } catch (error) {
      setBookingErrorByOfferId((prev) => ({
        ...prev,
        [offerId]: error instanceof Error ? error.message : "Failed to create booking",
      }));
    } finally {
      setBookingLoadingOfferId(null);
    }
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
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 md:px-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-semibold text-slate-900">Flight results</h1>
        {searchInfo && (
          <p className="mt-3 text-sm text-slate-600">
            {searchInfo.origin} to {searchInfo.destination} on {searchInfo.departure_date} for{" "}
            {searchInfo.passengers} passenger(s)
          </p>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="flex min-w-max gap-2">
            {dateOptions.map((dateOption) => {
              const isSelected = dateOption.isoDate === activeDate;
              return (
                <button
                  key={dateOption.key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(dateOption.isoDate);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isSelected
                      ? "bg-[#0f2d66] text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {dateOption.label}
                </button>
              );
            })}
          </div>
        </div>

        {offers.length === 0 ? (
          <p className="mt-6 text-slate-600">No flights found</p>
        ) : (
          <div className="mt-6 space-y-4">
            {offers.map((offer, index) => {
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
              const stops = readValue(offer, ["number_of_stops", "stops", "itinerary.stops"], "0");
              const totalAmount = readNumber(offer, [
                "total_amount",
                "price",
                "price_total",
                "fare.total_amount",
              ]);
              const totalCurrency = readValue(offer, ["total_currency", "currency"], "GBP");
              const offerId = readValue(offer, ["id"], "");
              const usdtEstimate =
                gbpUsdRate !== null ? (totalAmount * gbpUsdRate * 1.025).toFixed(2) : null;
              const bookingError = bookingErrorByOfferId[offerId];
              const isBooking = bookingLoadingOfferId === offerId;
              const numericStops = Number(stops);
              const stopLabel =
                Number.isFinite(numericStops) && numericStops <= 0
                  ? "Non-stop"
                  : `${stops} ${numericStops === 1 ? "stop" : "stops"}`;
              const stopBadgeClasses =
                Number.isFinite(numericStops) && numericStops <= 0
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700";
              const airlineInitials = getAirlineInitials(airline);

              return (
                <article
                  key={offerId || `${airline}-${departureTime}-${arrivalTime}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3 md:w-[24%]">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-200 text-sm font-bold text-[#0f2d66]">
                        {airlineInitials}
                      </div>
                      <p className="truncate text-base font-semibold text-slate-800">{airline}</p>
                    </div>

                    <div className="md:w-[46%]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-3xl font-bold text-slate-900">{formatTime(departureTime)}</p>
                        <div className="flex min-w-[110px] items-center gap-2 text-slate-400">
                          <div className="h-px flex-1 bg-slate-300" />
                          <span className="text-xs font-medium text-slate-500">{stopLabel}</span>
                          <div className="h-px flex-1 bg-slate-300" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{formatTime(arrivalTime)}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {searchInfo?.origin ?? "-"} to {searchInfo?.destination ?? "-"}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <p className="text-sm font-medium text-slate-600">{formatDuration(duration)}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stopBadgeClasses}`}
                        >
                          {stopLabel}
                        </span>
                      </div>
                    </div>

                    <div className="md:w-[20%] md:text-right">
                      <p className="text-3xl font-bold text-[#0f2d66]">
                        {isRateLoading
                          ? "..."
                          : usdtEstimate
                            ? `${usdtEstimate} USDT`
                            : `${totalAmount.toFixed(2)} USDT`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {totalAmount.toFixed(2)} {totalCurrency}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          void handleSelect(offer);
                        }}
                        disabled={isBooking}
                        className="mt-3 h-10 rounded-lg bg-[#0f2d66] px-5 text-sm font-semibold text-white transition hover:bg-[#12387d] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isBooking ? "Booking..." : "Select"}
                      </button>
                    </div>
                  </div>
                  {bookingError ? (
                    <p className="mt-3 text-sm text-red-600" role="alert">
                      {bookingError}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
