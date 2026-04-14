"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { searchFlights } from "@/lib/api";

type FlightOffer = Record<string, unknown>;

function extractAirportCode(value: string) {
  return value.split(" - ")[0]?.trim().toUpperCase() ?? value.trim().toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip">("oneWay");
  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const airports = [
    "SFO - San Francisco International",
    "LAX - Los Angeles International",
    "JFK - John F. Kennedy International",
    "LHR - London Heathrow",
    "NRT - Tokyo Narita",
    "SYD - Sydney Kingsford Smith",
  ];

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const origin = extractAirportCode(String(formData.get("origin") ?? ""));
    const destination = extractAirportCode(String(formData.get("destination") ?? ""));
    const departure_date = String(formData.get("departure_date") ?? "");
    const passengers = Number(formData.get("passengers") ?? 1);
    const searchParams = {
      origin,
      destination,
      departure_date,
      passengers,
    };

    try {
      console.log("searchFlights payload:", searchParams);
      const response = await searchFlights(searchParams);

      const offers = Array.isArray(response)
        ? (response as FlightOffer[])
        : response && typeof response === "object" && "offers" in response
          ? ((response as { offers?: FlightOffer[] }).offers ?? [])
          : [];

      sessionStorage.setItem("searchOffers", JSON.stringify(offers));
      sessionStorage.setItem(
        "searchParams",
        JSON.stringify({
          origin,
          destination,
          departure_date,
          passengers,
        })
      );

      router.push("/results");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to search flights. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3F6FB] text-[#0B1F3A]">
      <section
        className="relative min-h-[540px] w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600')",
        }}
      >
        <div className="absolute inset-0 bg-[#071A33]/70" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-6 pb-36 pt-20 md:px-10 lg:pt-24">
          <div className="max-w-3xl text-white">
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Book Flights with Crypto Worldwide
            </h1>
            <p className="mt-5 text-lg text-blue-100 md:text-2xl">
              Search 600+ airlines. Pay with USDT.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-20 w-full max-w-7xl px-6 pb-10 md:px-10">
        <div className="rounded-2xl bg-white p-5 shadow-[0_20px_45px_rgba(12,33,66,0.18)] md:p-6">
          <div className="mb-4 flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1C355E]">
              <input
                type="radio"
                name="tripType"
                value="roundTrip"
                checked={tripType === "roundTrip"}
                onChange={() => {
                  setTripType("roundTrip");
                }}
                className="h-4 w-4 accent-[#2563EB]"
              />
              Round trip
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1C355E]">
              <input
                type="radio"
                name="tripType"
                value="oneWay"
                checked={tripType === "oneWay"}
                onChange={() => {
                  setTripType("oneWay");
                }}
                className="h-4 w-4 accent-[#2563EB]"
              />
              One way
            </label>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr_1fr_1fr_1fr_auto] lg:items-end"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="origin" className="text-sm font-medium text-[#1C355E]">
                ✈ From
              </label>
              <input
                id="origin"
                name="origin"
                list="airports"
                required
                placeholder="From"
                value={originInput}
                onChange={(event) => {
                  setOriginInput(event.target.value);
                }}
                className="h-12 rounded-xl border border-[#D6E0ED] bg-white px-4 text-[#0B1F3A] placeholder:text-[#6B7F99] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
              />
            </div>

            <div className="flex justify-center lg:pb-1">
              <button
                type="button"
                onClick={() => {
                  setOriginInput(destinationInput);
                  setDestinationInput(originInput);
                }}
                className="h-12 w-12 rounded-xl border border-[#D6E0ED] text-xl text-[#1C355E] transition hover:border-[#2563EB] hover:text-[#2563EB]"
                aria-label="Swap origin and destination"
              >
                ⇄
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="destination" className="text-sm font-medium text-[#1C355E]">
                To
              </label>
              <input
                id="destination"
                name="destination"
                list="airports"
                required
                placeholder="To"
                value={destinationInput}
                onChange={(event) => {
                  setDestinationInput(event.target.value);
                }}
                className="h-12 rounded-xl border border-[#D6E0ED] bg-white px-4 text-[#0B1F3A] placeholder:text-[#6B7F99] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="departure_date" className="text-sm font-medium text-[#1C355E]">
                📅 Departure date
              </label>
              <input
                id="departure_date"
                name="departure_date"
                type="date"
                min={today}
                required
                defaultValue={today}
                className="h-12 rounded-xl border border-[#D6E0ED] bg-white px-4 text-[#0B1F3A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
              />
            </div>

            {tripType === "roundTrip" ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="return_date" className="text-sm font-medium text-[#1C355E]">
                  📅 Return date
                </label>
                <input
                  id="return_date"
                  name="return_date"
                  type="date"
                  min={today}
                  className="h-12 rounded-xl border border-[#D6E0ED] bg-white px-4 text-[#0B1F3A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
                />
              </div>
            ) : (
              <div className="hidden lg:block" />
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="passengers" className="text-sm font-medium text-[#1C355E]">
                👤 Passengers
              </label>
              <select
                id="passengers"
                name="passengers"
                defaultValue="1"
                className="h-12 rounded-xl border border-[#D6E0ED] bg-white px-4 text-[#0B1F3A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#93C5FD]"
              >
                {Array.from({ length: 9 }, (_, idx) => idx + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 rounded-xl bg-[#2563EB] px-8 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>

            {error ? (
              <p className="text-sm text-red-600 lg:col-span-7" role="alert">
                {error}
              </p>
            ) : null}
          </form>
          <datalist id="airports">
            {airports.map((airport) => (
              <option key={airport} value={airport} />
            ))}
          </datalist>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-10">
        <div className="rounded-2xl border border-[#DCE6F3] bg-white px-6 py-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 text-center text-sm font-semibold text-[#1C355E] md:grid-cols-3 md:text-base">
            <p>600+ Airlines</p>
            <p>100+ Countries</p>
            <p>Pay with USDT</p>
          </div>
        </div>
      </section>
    </main>
  );
}
