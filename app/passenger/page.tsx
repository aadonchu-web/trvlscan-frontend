"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "@/lib/api";
import { GENDER_OPTIONS, Gender, PassengerData, TITLE_OPTIONS, Title } from "@/lib/types";
import { COUNTRIES } from "@/lib/countries";

type OfferRecord = Record<string, unknown>;

type SearchInfo = {
  origin: string;
  destination: string;
  departure_date: string;
  passengers: number;
};

type FormState = {
  title: Title | "";
  gender: Gender | "";
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  passportIssuingCountry: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  gender: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  nationality: "",
  passportNumber: "",
  passportExpiry: "",
  passportIssuingCountry: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function validate(data: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const today = todayStr();

  if (!data.title) errors.title = "Title is required";
  if (!data.gender) errors.gender = "Gender is required";
  if (!data.firstName.trim()) errors.firstName = "First name is required";
  if (!data.lastName.trim()) errors.lastName = "Last name is required";

  if (!data.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required";
  } else if (data.dateOfBirth > today) {
    errors.dateOfBirth = "Date of birth cannot be in the future";
  }

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!data.phone.trim()) {
    errors.phone = "Phone is required";
  } else if (!/^\+\d{8,15}$/.test(data.phone.trim())) {
    errors.phone = "Phone must be in E.164 format e.g. +971501234567";
  }

  if (!data.nationality) errors.nationality = "Nationality is required";

  if (!data.passportNumber.trim()) errors.passportNumber = "Passport number is required";

  if (!data.passportExpiry) {
    errors.passportExpiry = "Passport expiry is required";
  } else if (data.passportExpiry <= today) {
    errors.passportExpiry = "Passport expiry must be a future date";
  }

  if (!data.passportIssuingCountry) errors.passportIssuingCountry = "Issuing country is required";

  return errors;
}

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

  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  useEffect(() => {
    const rawOffer = sessionStorage.getItem("selectedOffer");
    const rawSearchParams = sessionStorage.getItem("searchParams");
    const rawPassenger = sessionStorage.getItem("passenger_data");

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

    if (rawPassenger) {
      try {
        const parsed = JSON.parse(rawPassenger);
        if (parsed && typeof parsed === "object") {
          setFormData((prev) => ({ ...prev, ...(parsed as Partial<FormState>) }));
        }
      } catch {
        // ignore corrupt cache
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

  const errors = useMemo(() => validate(formData), [formData]);

  const showError = (field: keyof FormState) =>
    Boolean((hasAttemptedSubmit || touched[field]) && errors[field]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const inputClass = (field: keyof FormState) =>
    `w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
      showError(field) ? "border-red-500" : "border-gray-300"
    }`;

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const errorClass = "text-sm text-red-600 mt-1";

  const maxBirthDate = todayStr();
  const minExpiryDate = tomorrowStr();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setSubmitError(null);

    if (!selectedOffer || !summary.offerId) {
      setSubmitError("No selected flight found. Please choose a flight again.");
      return;
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    const passenger: PassengerData = {
      title: formData.title as Title,
      gender: formData.gender as Gender,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      dateOfBirth: formData.dateOfBirth,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      nationality: formData.nationality,
      passportNumber: formData.passportNumber.trim(),
      passportExpiry: formData.passportExpiry,
      passportIssuingCountry: formData.passportIssuingCountry,
    };

    setIsSubmitting(true);
    try {
      sessionStorage.setItem("passenger_data", JSON.stringify(passenger));

      const booking = (await createBooking({
        offerId: summary.offerId,
        passenger,
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
          passenger_data: passenger,
        }),
      );

      router.push(`/booking/${booking.booking_id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCountryOptions = (keyPrefix: string) =>
    COUNTRIES.map((c) =>
      c.code === "---" ? (
        <option key={`${keyPrefix}-sep`} disabled>
          {c.name}
        </option>
      ) : (
        <option key={`${keyPrefix}-${c.code}`} value={c.code}>
          {c.name}
        </option>
      ),
    );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F0F4F9] px-4 py-4 text-[#0B1F3A] sm:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-semibold text-white">
                  ✓
                </span>
                <span className="text-[#2563EB]">Search</span>
              </div>
              <div className="h-px flex-1 bg-[#2563EB]" />
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-semibold text-white">
                  2
                </span>
                <span className="text-[#2563EB]">Flight</span>
              </div>
              <div className="h-px flex-1 bg-[#2563EB]" />
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-semibold text-white">
                  3
                </span>
                <span className="font-semibold text-[#2563EB]">Passenger Details</span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-500">
                  4
                </span>
                <span>Payment</span>
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-[#E2EAF4] bg-white p-4 sm:p-6">
            <h1 className="text-lg font-semibold text-[#0B1F3A]">Passenger Details</h1>
            <p className="mt-1 text-sm text-slate-400">Traveler 1 · Adult</p>

            <form onSubmit={handleSubmit} noValidate className="mt-3">
              {submitError ? (
                <div
                  className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {submitError}
                </div>
              ) : null}

              <h2 className="text-lg font-semibold mt-0 mb-4">Personal details</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="title" className={labelClass}>
                    Title
                  </label>
                  <select
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={(e) => update("title", e.target.value as Title | "")}
                    onBlur={() => markTouched("title")}
                    className={inputClass("title")}
                  >
                    <option value="">Select title</option>
                    {TITLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {showError("title") ? <p className={errorClass}>{errors.title}</p> : null}
                </div>

                <div>
                  <label htmlFor="gender" className={labelClass}>
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={(e) => update("gender", e.target.value as Gender | "")}
                    onBlur={() => markTouched("gender")}
                    className={inputClass("gender")}
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {showError("gender") ? <p className={errorClass}>{errors.gender}</p> : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={labelClass}>
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    onBlur={() => markTouched("firstName")}
                    className={inputClass("firstName")}
                  />
                  {showError("firstName") ? <p className={errorClass}>{errors.firstName}</p> : null}
                </div>

                <div>
                  <label htmlFor="lastName" className={labelClass}>
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    onBlur={() => markTouched("lastName")}
                    className={inputClass("lastName")}
                  />
                  {showError("lastName") ? <p className={errorClass}>{errors.lastName}</p> : null}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="dateOfBirth" className={labelClass}>
                  Date of birth
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  max={maxBirthDate}
                  value={formData.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  onBlur={() => markTouched("dateOfBirth")}
                  className={inputClass("dateOfBirth")}
                />
                {showError("dateOfBirth") ? <p className={errorClass}>{errors.dateOfBirth}</p> : null}
              </div>

              <div className="mt-4">
                <label htmlFor="nationality" className={labelClass}>
                  Nationality
                </label>
                <select
                  id="nationality"
                  name="nationality"
                  required
                  value={formData.nationality}
                  onChange={(e) => update("nationality", e.target.value)}
                  onBlur={() => markTouched("nationality")}
                  className={inputClass("nationality")}
                >
                  <option value="">Select country</option>
                  {renderCountryOptions("nat")}
                </select>
                {showError("nationality") ? <p className={errorClass}>{errors.nationality}</p> : null}
              </div>

              <h2 className="text-lg font-semibold mt-8 mb-4">Contact</h2>

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                  onBlur={() => markTouched("email")}
                  className={inputClass("email")}
                />
                {showError("email") ? <p className={errorClass}>{errors.email}</p> : null}
              </div>

              <div className="mt-4">
                <label htmlFor="phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="+971501234567"
                  value={formData.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  onBlur={() => markTouched("phone")}
                  className={inputClass("phone")}
                />
                {showError("phone") ? <p className={errorClass}>{errors.phone}</p> : null}
              </div>

              <h2 className="text-lg font-semibold mt-8 mb-4">Passport / Travel document</h2>

              <div>
                <label htmlFor="passportNumber" className={labelClass}>
                  Passport number
                </label>
                <input
                  id="passportNumber"
                  name="passportNumber"
                  required
                  value={formData.passportNumber}
                  onChange={(e) => update("passportNumber", e.target.value.toUpperCase())}
                  onBlur={() => markTouched("passportNumber")}
                  className={inputClass("passportNumber")}
                />
                {showError("passportNumber") ? (
                  <p className={errorClass}>{errors.passportNumber}</p>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="passportExpiry" className={labelClass}>
                    Passport expiry
                  </label>
                  <input
                    id="passportExpiry"
                    name="passportExpiry"
                    type="date"
                    required
                    min={minExpiryDate}
                    value={formData.passportExpiry}
                    onChange={(e) => update("passportExpiry", e.target.value)}
                    onBlur={() => markTouched("passportExpiry")}
                    className={inputClass("passportExpiry")}
                  />
                  {showError("passportExpiry") ? (
                    <p className={errorClass}>{errors.passportExpiry}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="passportIssuingCountry" className={labelClass}>
                    Issuing country
                  </label>
                  <select
                    id="passportIssuingCountry"
                    name="passportIssuingCountry"
                    required
                    value={formData.passportIssuingCountry}
                    onChange={(e) => update("passportIssuingCountry", e.target.value)}
                    onBlur={() => markTouched("passportIssuingCountry")}
                    className={inputClass("passportIssuingCountry")}
                  >
                    <option value="">Select country</option>
                    {renderCountryOptions("iss")}
                  </select>
                  {showError("passportIssuingCountry") ? (
                    <p className={errorClass}>{errors.passportIssuingCountry}</p>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-8 h-11 w-full rounded-xl bg-[#2563EB] text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Processing..." : "Continue to Payment →"}
              </button>
            </form>
          </section>
        </div>

        <aside className="h-fit w-full overflow-hidden rounded-2xl border border-[#E2EAF4] bg-white lg:sticky lg:top-6 lg:w-72">
          <div className="bg-[#0B1F3A] px-4 py-3 text-white">
            <p className="text-xs uppercase tracking-wider opacity-60">Flight Summary</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{summary.route.replace("->", "→")}</p>
              <p className="text-sm font-bold text-[#93C5FD]">{summary.usdtPrice}</p>
            </div>
          </div>

          <div className="space-y-2 px-4 py-3">
            <p className="flex items-center gap-2 py-2 text-sm text-slate-600">
              <span aria-hidden>📅</span>
              <span>{summary.dateTime}</span>
            </p>
            <p className="flex items-center gap-2 py-2 text-sm text-slate-600">
              <span aria-hidden>🕒</span>
              <span>{summary.durationStops}</span>
            </p>

            <div className="border-t border-[#F0F4F9]" />

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Total to pay</p>
              <p className="text-2xl font-bold text-[#2563EB]">{summary.usdtPrice}</p>
              <p className="mt-0.5 text-sm text-slate-400">{summary.fiatPrice}</p>
            </div>

            <div className="hidden rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 sm:block">
              <p className="text-xs text-amber-700">Price guaranteed for 12 min after booking</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
