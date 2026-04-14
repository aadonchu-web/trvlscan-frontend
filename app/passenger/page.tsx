"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "@/lib/api";

type OfferRecord = Record<string, unknown>;

type SearchInfo = {
  origin: string;
  destination: string;
  departure_date: string;
  passengers: number;
};

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
    if (!value) {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
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

export default function PassengerPage() {
  const router = useRouter();
  const [selectedOffer, setSelectedOffer] = useState<OfferRecord | null>(null);
  const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const rawOffer = sessionStorage.getItem("selectedOffer");
    const rawSearchParams = sessionStorage.getItem("searchParams");

    if (rawOffer) {
      try {
        const parsed = JSON.parse(rawOffer);
        if (parsed && typeof parsed === "object") {
          setSelectedOffer(parsed as OfferRecord);
        }
      } catch {
        setSelectedOffer(null);
      }
    }

    if (rawSearchParams) {
      try {
        const parsed = JSON.parse(rawSearchParams) as Partial<SearchInfo>;
        setSearchInfo({
          origin: parsed.origin ?? "-",
          destination: parsed.destination ?? "-",
          departure_date: parsed.departure_date ?? "-",
          passengers: Number(parsed.passengers ?? 1),
        });
      } catch {
        setSearchInfo(null);
      }
    }
  }, []);

  const summary = useMemo(() => {
    if (!selectedOffer) {
      return {
        offerId: "",
        route: `${searchInfo?.origin ?? "SFO"} -> ${searchInfo?.destination ?? "LAX"}`,
        dateTime: searchInfo?.departure_date ?? "-",
        durationStops: "-",
        usdtPrice: "-",
        fiatPrice: "-",
      };
    }

    const offerId = readValue(selectedOffer, ["id"], "");
    const departureTime = readValue(selectedOffer, [
      "departure_time",
      "departure",
      "outbound.departure_time",
      "itinerary.departure_time",
    ]);
    const duration = readValue(selectedOffer, ["duration", "flight_duration", "itinerary.duration"]);
    const stops = readValue(selectedOffer, ["number_of_stops", "stops", "itinerary.stops"], "0");
    const totalAmount = readNumber(selectedOffer, [
      "total_amount",
      "price",
      "price_total",
      "fare.total_amount",
    ]);
    const totalCurrency = readValue(selectedOffer, ["total_currency", "currency"], "GBP");
    const route =
      searchInfo?.origin && searchInfo?.destination
        ? `${searchInfo.origin} -> ${searchInfo.destination}`
        : "SFO -> LAX";

    const cachedRate = Number(sessionStorage.getItem("currencyRate_GBP_USD") ?? "");
    const gbpToUsd = Number.isFinite(cachedRate) && cachedRate > 0 ? cachedRate : 1.27;
    const usdBase = totalCurrency.toUpperCase() === "GBP" ? totalAmount * gbpToUsd : totalAmount;
    const usdtPrice = usdBase > 0 ? `${(usdBase * 1.025).toFixed(2)} USDT` : "-";

    const numericStops = Number(stops);
    const stopText =
      Number.isFinite(numericStops) && numericStops <= 0
        ? "Non-stop"
        : `${stops} ${numericStops === 1 ? "stop" : "stops"}`;

    return {
      offerId,
      route,
      dateTime: formatDateTime(departureTime),
      durationStops: `${formatDuration(duration)} | ${stopText}`,
      usdtPrice,
      fiatPrice: `${totalAmount.toFixed(2)} ${totalCurrency}`,
    };
  }, [searchInfo, selectedOffer]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedOffer || !summary.offerId) {
      setSubmitError("No selected flight found. Please choose a flight again.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const gender = String(formData.get("gender") ?? "male");
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const nationality = String(formData.get("nationality") ?? "").trim();

    const passengerData = {
      gender,
      firstName,
      lastName,
      dateOfBirth,
      email,
      phone,
      nationality,
    };

    setIsSubmitting(true);
    try {
      sessionStorage.setItem("passengerData", JSON.stringify(passengerData));

      const booking = (await createBooking({
        offerId: summary.offerId,
        passengerName: `${firstName} ${lastName}`.trim(),
        passengerEmail: email,
        passengerDob: dateOfBirth,
      })) as {
        booking_id: string;
        usd_amount?: number;
        usdt_amount?: number;
        expires_at?: string;
      };

      sessionStorage.setItem(
        "currentBooking",
        JSON.stringify({
          ...booking,
          selected_offer: selectedOffer,
          search_params: searchInfo,
          passenger_data: passengerData,
        }),
      );

      router.push(`/booking/${booking.booking_id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F4F7FC] px-4 py-8 text-[#0B1F3A] md:px-8 md:py-10">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-sm md:p-7">
          <h1 className="text-2xl font-bold text-[#0F2748]">Passenger Details</h1>
          <p className="mt-5 text-base font-semibold text-[#1D3657]">Traveler 1: Adult</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-[#1C355E]">Gender</p>
              <div className="mt-2 flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-[#1C355E]">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    defaultChecked
                    className="h-4 w-4 accent-[#2563EB]"
                  />
                  Male
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-[#1C355E]">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    className="h-4 w-4 accent-[#2563EB]"
                  />
                  Female
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="firstName" className="text-sm font-medium text-[#1C355E]">
                  First name*
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  required
                  className="h-11 rounded-xl border border-[#D6E0ED] px-4 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="lastName" className="text-sm font-medium text-[#1C355E]">
                  Last name*
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  required
                  className="h-11 rounded-xl border border-[#D6E0ED] px-4 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="dateOfBirth" className="text-sm font-medium text-[#1C355E]">
                Date of birth*
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                required
                className="h-11 rounded-xl border border-[#D6E0ED] px-4 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
              />
              <p className="text-xs text-slate-500">Format: DD/MM/YYYY</p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-[#1C355E]">
                Email*
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="h-11 rounded-xl border border-[#D6E0ED] px-4 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
              />
              <p className="text-xs text-slate-500">
                Booking confirmation will be sent to this email
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-sm font-medium text-[#1C355E]">
                  Phone number*
                </label>
                <input
                  id="phone"
                  name="phone"
                  required
                  className="h-11 rounded-xl border border-[#D6E0ED] px-4 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="nationality" className="text-sm font-medium text-[#1C355E]">
                  Nationality*
                </label>
                <input
                  id="nationality"
                  name="nationality"
                  required
                  className="h-11 rounded-xl border border-[#D6E0ED] px-4 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
                />
              </div>
            </div>

            {submitError ? (
              <p className="text-sm text-red-600" role="alert">
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-12 w-full rounded-xl bg-[#0F2748] px-6 text-sm font-semibold text-white transition hover:bg-[#13335e] disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            >
              {isSubmitting ? "Processing..." : "Continue to Payment"}
            </button>
          </form>
        </section>

        <aside className="h-fit rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-bold text-[#0F2748]">Booking Summary</h2>
          <div className="mt-4 space-y-3 text-sm text-[#334E73]">
            <p className="text-base font-semibold text-[#0F2748]">{summary.route}</p>
            <p>{summary.dateTime}</p>
            <p>{summary.durationStops}</p>
          </div>

          <div className="mt-6 border-t border-[#E3EBF6] pt-4">
            <p className="text-3xl font-bold text-emerald-600">{summary.usdtPrice}</p>
            <p className="mt-1 text-sm text-slate-500">{summary.fiatPrice}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
