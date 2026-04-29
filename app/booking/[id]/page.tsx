"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createPayment, getPaymentStatus } from "@/lib/api";

type BookingPageProps = {
  params: {
    id: string;
  };
};

type BookingSessionData = {
  booking_id: string;
  usdt_amount?: number;
  expires_at?: string;
  selected_offer?: Record<string, unknown>;
  search_params?: {
    origin?: string;
    destination?: string;
    departure_date?: string;
    passengers?: number;
  } | null;
};

type PaymentData = {
  payment_id: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  expires_at?: string;
};

type PaymentStatusResponse = {
  status?: string;
  payment_status?: string;
};

function readValue(source: Record<string, unknown> | undefined, paths: string[], fallback = "-") {
  if (!source) {
    return fallback;
  }

  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = source;

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

function formatDuration(value: string) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(value.trim());
  if (!match) {
    return value;
  }

  const hours = match[1] ? `${match[1]}h` : "";
  const minutes = match[2] ? `${match[2]}m` : "";
  return [hours, minutes].filter(Boolean).join(" ") || "0m";
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

const TWELVE_MIN_SECONDS = 12 * 60;

export default function BookingPage({ params }: BookingPageProps) {
  const [booking, setBooking] = useState<BookingSessionData | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");

  useEffect(() => {
    const rawBooking = sessionStorage.getItem("currentBooking");
    if (!rawBooking) {
      setError("No booking found in this session.");
      setIsCreatingPayment(false);
      return;
    }

    try {
      const parsed = JSON.parse(rawBooking) as BookingSessionData;
      setBooking(parsed);
    } catch {
      setError("Unable to read booking details.");
      setIsCreatingPayment(false);
    }
  }, []);

  useEffect(() => {
    if (!booking?.booking_id) {
      return;
    }

    let isCancelled = false;

    async function initPayment() {
      setIsCreatingPayment(true);
      setError(null);
      try {
        if (!booking) return;
        const response = (await createPayment(booking.booking_id)) as PaymentData;
        if (!isCancelled) {
          setPayment(response);
        }
      } catch (paymentError) {
        if (!isCancelled) {
          setError(
            paymentError instanceof Error ? paymentError.message : "Failed to initialize payment.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsCreatingPayment(false);
        }
      }
    }

    void initPayment();

    return () => {
      isCancelled = true;
    };
  }, [booking?.booking_id]);

  useEffect(() => {
    if (!booking?.booking_id || paymentStatus === "confirmed") {
      return;
    }

    let isCancelled = false;

    async function pollStatus() {
      try {
        if (!booking) return;
        const response = (await getPaymentStatus(booking.booking_id)) as PaymentStatusResponse;
        if (isCancelled) {
          return;
        }

        const nextStatus = (response.payment_status ?? response.status ?? "").toLowerCase();
        if (nextStatus) {
          setPaymentStatus(nextStatus);
        }
      } catch {
        // Ignore transient polling errors and keep waiting state.
      }
    }

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 8000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [booking?.booking_id, paymentStatus]);

  useEffect(() => {
    const expiresAt = payment?.expires_at ?? booking?.expires_at;
    if (!expiresAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const expiryMs = new Date(expiresAt).getTime();
      if (!Number.isFinite(expiryMs)) {
        setRemainingSeconds(null);
        return;
      }

      const nowMs = Date.now();
      const seconds = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
      setRemainingSeconds(seconds);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [booking?.expires_at, payment?.expires_at]);

  const timerText = useMemo(() => {
    if (remainingSeconds === null) {
      return "--:--";
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds]);

  const timerProgress = useMemo(() => {
    if (remainingSeconds === null) return 1;
    return Math.max(0, Math.min(1, remainingSeconds / TWELVE_MIN_SECONDS));
  }, [remainingSeconds]);

  const timerUrgent = remainingSeconds !== null && remainingSeconds <= 120 && remainingSeconds > 0;
  const timerExpired = remainingSeconds === 0;

  const offer = booking?.selected_offer;
  const airline = readValue(offer, ["airline.name", "airline_name", "airline", "carrier"]);
  const departure = readValue(offer, ["departure_time", "departure"]);
  const arrival = readValue(offer, ["arrival_time", "arrival"]);
  const duration = readValue(offer, ["duration"]);
  const stops = readValue(offer, ["number_of_stops", "stops"], "0");
  const totalAmount = readValue(offer, ["total_amount"], "-");
  const totalCurrency = readValue(offer, ["total_currency"], "GBP");
  const network = "Tron (TRC-20)";
  const usdtAmount = (payment?.pay_amount ?? booking?.usdt_amount ?? 0).toFixed(2);

  const isConfirmed = paymentStatus === "confirmed";

  const handleCopyAddress = async () => {
    if (!payment?.pay_address) {
      return;
    }
    try {
      await navigator.clipboard.writeText(payment.pay_address);
      setCopySuccess(true);
      window.setTimeout(() => {
        setCopySuccess(false);
      }, 1800);
    } catch {
      setCopySuccess(false);
    }
  };

  // Circular timer ring math
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - timerProgress);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F4F7FC] px-4 py-10 text-[#0B1F3A] md:px-8">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -10%, rgba(37,99,235,0.10), transparent 60%), radial-gradient(800px 500px at 100% 100%, rgba(139,92,246,0.06), transparent 60%)",
        }}
      />

      <div className="mx-auto w-full max-w-3xl">
        {/* Stepper / breadcrumb */}
        <nav aria-label="Booking progress" className="mb-5 flex items-center justify-center gap-2 text-xs font-medium">
          <StepDot label="Search" status="done" />
          <StepLine />
          <StepDot label="Passenger" status="done" />
          <StepLine />
          <StepDot label="Payment" status="active" />
        </nav>

        <section className="overflow-hidden rounded-3xl border border-[#E3EBF6] bg-white shadow-[0_24px_60px_-20px_rgba(13,33,66,0.18)]">
          {/* Header */}
          <header className="relative border-b border-[#EAF0FA] bg-gradient-to-br from-white via-[#F8FAFF] to-[#EEF3FA] px-6 py-7 md:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Secure payment
                  </p>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F2748] md:text-[34px]">
                  Send USDT to confirm booking
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500">
                  <span>Booking ID</span>
                  <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[12px] text-[#0F2748]">
                    {params.id}
                  </code>
                </p>
              </div>

              {/* Timer */}
              <div
                className={`flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                  timerExpired
                    ? "border-rose-200 bg-rose-50"
                    : timerUrgent
                    ? "border-amber-200 bg-amber-50"
                    : "border-blue-100 bg-blue-50/70"
                }`}
                role="timer"
                aria-live="polite"
              >
                <div className="relative flex h-[64px] w-[64px] items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden>
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className={
                        timerExpired
                          ? "text-rose-100"
                          : timerUrgent
                          ? "text-amber-100"
                          : "text-blue-100"
                      }
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                      className={`transition-[stroke-dashoffset] duration-700 ease-out ${
                        timerExpired
                          ? "text-rose-500"
                          : timerUrgent
                          ? "text-amber-500"
                          : "text-blue-600"
                      }`}
                    />
                  </svg>
                  <ClockIcon
                    className={`h-5 w-5 ${
                      timerExpired
                        ? "text-rose-600"
                        : timerUrgent
                        ? "text-amber-600"
                        : "text-blue-600"
                    }`}
                  />
                </div>
                <div className="leading-tight">
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      timerExpired
                        ? "text-rose-700"
                        : timerUrgent
                        ? "text-amber-700"
                        : "text-blue-700"
                    }`}
                  >
                    {timerExpired ? "Expired" : "Time remaining"}
                  </p>
                  <p
                    className={`font-mono text-2xl font-bold tabular-nums ${
                      timerExpired
                        ? "text-rose-700"
                        : timerUrgent
                        ? "text-amber-700"
                        : "text-[#0F2748]"
                    }`}
                  >
                    {timerText}
                  </p>
                </div>
              </div>
            </div>

            {/* Amount strip */}
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#E3EBF6] bg-white/80 p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Amount to send
                </p>
                <p className="mt-1 flex items-baseline gap-2 font-[var(--font-jakarta,inherit)]">
                  <span className="text-3xl font-bold tracking-tight text-[#0F2748] tabular-nums md:text-[36px]">
                    {usdtAmount}
                  </span>
                  <span className="text-base font-semibold text-slate-500">USDT</span>
                </p>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-[#E3EBF6] bg-[#F4F7FC] px-3 py-1.5 md:self-auto">
                <TronIcon className="h-4 w-4 text-[#EF4444]" />
                <span className="text-[12px] font-semibold text-[#0F2748]">{network}</span>
              </div>
            </div>
          </header>

          {/* Pay panel */}
          <div className="grid gap-5 p-6 md:grid-cols-[260px_1fr] md:gap-6 md:p-8">
            {/* QR */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E3EBF6] bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Scan to pay
              </p>
              <div className="mt-3 rounded-xl border border-[#EEF3FA] bg-white p-3 shadow-sm">
                {payment?.pay_address ? (
                  <QRCodeSVG
                    value={payment.pay_address}
                    size={168}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0F2748"
                  />
                ) : (
                  <div className="flex h-[168px] w-[168px] items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-500">
                    {error ? "Unavailable" : "Generating QR..."}
                  </div>
                )}
              </div>
              <p className="mt-3 text-center text-[12px] leading-relaxed text-slate-500">
                Open your wallet app and scan
                <br /> with the camera.
              </p>
            </div>

            {/* Wallet + status */}
            <div className="flex flex-col gap-4">
              {/* Wallet */}
              <div className="rounded-2xl border border-[#E3EBF6] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Wallet address
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Verified
                  </span>
                </div>

                <div className="mt-2 flex items-stretch gap-2">
                  <div className="min-w-0 flex-1 rounded-xl border border-[#EEF3FA] bg-[#F8FAFF] p-3">
                    <p className="break-all font-mono text-[13px] leading-relaxed text-[#0F2748]">
                      {isCreatingPayment
                        ? "Creating payment…"
                        : payment?.pay_address ?? "Address unavailable"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopyAddress();
                    }}
                    disabled={!payment?.pay_address}
                    aria-label={copySuccess ? "Address copied" : "Copy wallet address"}
                    className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-stretch rounded-xl px-3 py-2 text-[12px] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                      copySuccess
                        ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                        : "bg-[#0F2748] text-white shadow-sm hover:bg-[#13335e]"
                    }`}
                  >
                    {copySuccess ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-slate-500">
                  <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>
                    Send only <span className="font-semibold text-[#0F2748]">USDT</span> on the{" "}
                    <span className="font-semibold text-[#0F2748]">Tron (TRC-20)</span> network.
                    Other tokens or networks will be lost.
                  </span>
                </p>
              </div>

              {/* Status */}
              <div
                className={`rounded-2xl border p-5 transition-colors ${
                  isConfirmed
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-[#E3EBF6] bg-white"
                }`}
                aria-live="polite"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {isConfirmed ? (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                        <CheckIcon className="h-5 w-5" />
                      </span>
                    ) : (
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                        <span className="absolute inset-0 animate-ping rounded-full bg-blue-200 opacity-60" />
                        <span className="relative h-2.5 w-2.5 rounded-full bg-blue-600" />
                      </span>
                    )}
                    <div>
                      <p className="text-[14px] font-semibold text-[#0F2748]">
                        {isConfirmed
                          ? "Payment confirmed"
                          : "Waiting for blockchain confirmation"}
                      </p>
                      <p className="text-[12px] text-slate-500">
                        {isConfirmed
                          ? "Your booking is now secured."
                          : "We'll detect your transfer automatically."}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide sm:inline-flex ${
                      isConfirmed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isConfirmed ? "Confirmed" : "Pending"}
                  </span>
                </div>

                {/* Status track */}
                <ol className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  <StatusStep label="Sent" state={isConfirmed ? "done" : "active"} />
                  <StatusStep
                    label="Confirming"
                    state={isConfirmed ? "done" : "active"}
                  />
                  <StatusStep label="Booked" state={isConfirmed ? "done" : "pending"} />
                </ol>
              </div>
            </div>
          </div>

          {/* Booking summary */}
          <div className="border-t border-[#EAF0FA] bg-[#F8FAFF] px-6 py-5 md:px-8">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0F2748] shadow-sm ring-1 ring-[#E3EBF6]">
                <PlaneIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-semibold text-[#0F2748]">
                  <span>{booking?.search_params?.origin ?? "-"}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>{booking?.search_params?.destination ?? "-"}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-500">
                    {booking?.search_params?.departure_date ?? "-"}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-500">
                    {booking?.search_params?.passengers ?? 1} pax
                  </span>
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {airline} · {formatTime(departure)} – {formatTime(arrival)} ·{" "}
                  {formatDuration(duration)} · {stops} stop(s)
                </p>
                <p className="mt-1 text-[12px] text-slate-400">
                  Offer price: {totalAmount} {totalCurrency}
                </p>
              </div>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="border-t border-rose-100 bg-rose-50 px-6 py-3 text-[13px] font-medium text-rose-700 md:px-8"
            >
              {error}
            </div>
          ) : null}
        </section>

        {/* Trust strip */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <LockIcon className="h-3.5 w-3.5 text-slate-400" />
            End-to-end encrypted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-slate-400" />
            On-chain verified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BoltIcon className="h-3.5 w-3.5 text-slate-400" />
            Auto-detected within seconds
          </span>
        </div>
      </div>
    </main>
  );
}

/* ---------- Small UI primitives ---------- */

function StepDot({ label, status }: { label: string; status: "done" | "active" | "pending" }) {
  const styles =
    status === "active"
      ? "bg-blue-600 text-white ring-4 ring-blue-100"
      : status === "done"
      ? "bg-emerald-500 text-white"
      : "bg-slate-200 text-slate-500";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${styles}`}
      >
        {status === "done" ? <CheckIcon className="h-3 w-3" /> : "•"}
      </span>
      <span
        className={
          status === "active"
            ? "text-[#0F2748]"
            : status === "done"
            ? "text-slate-600"
            : "text-slate-400"
        }
      >
        {label}
      </span>
    </div>
  );
}

function StepLine() {
  return <span className="h-px w-6 bg-slate-200 sm:w-10" />;
}

function StatusStep({ label, state }: { label: string; state: "done" | "active" | "pending" }) {
  const bar =
    state === "done"
      ? "bg-emerald-500"
      : state === "active"
      ? "bg-blue-500"
      : "bg-slate-200";
  const text =
    state === "done"
      ? "text-emerald-700"
      : state === "active"
      ? "text-blue-700"
      : "text-slate-400";
  return (
    <li className="flex flex-col gap-1.5">
      <span className={`h-1 w-full rounded-full ${bar}`} />
      <span className={`font-semibold uppercase tracking-wide ${text}`}>{label}</span>
    </li>
  );
}

/* ---------- Inline SVG icons (lucide-style) ---------- */

type IconProps = { className?: string };

function ClockIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CopyIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function InfoIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function PlaneIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function LockIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function BoltIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function TronIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 5 3 3l8 18 4-7 6-9zM5.5 4.7l11 1.3L11 14.3 5.5 4.7zM12 15.7l4.7-7.9L18.7 6 12 15.7z" />
    </svg>
  );
}
