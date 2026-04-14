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
        className="relative min-h-[420px] w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600')",
        }}
      >
        <div className="absolute inset-0 bg-[#071A33]/65" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-6 pb-28 pt-16 md:px-10 md:pt-20">
          <div className="max-w-3xl text-white">
            <h1 className="text-4xl font-bold text-white md:text-5xl">Book Flights with Crypto</h1>
            <p className="mt-4 text-lg text-blue-100">Search 600+ airlines. Pay with USDT.</p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 pb-6 md:px-6">
        <div className="rounded-2xl bg-white px-5 py-4 shadow-lg">
          <div className="mb-3 flex items-center gap-4 text-sm text-[#1C355E]">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="tripType"
                value="roundTrip"
                checked={tripType === "roundTrip"}
                onChange={() => {
                  setTripType("roundTrip");
                }}
                className="h-3.5 w-3.5 accent-[#2563EB]"
              />
              Round trip
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="tripType"
                value="oneWay"
                checked={tripType === "oneWay"}
                onChange={() => {
                  setTripType("oneWay");
                }}
                className="h-3.5 w-3.5 accent-[#2563EB]"
              />
              One way
            </label>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-2 gap-3 lg:flex lg:items-center"
          >
            <div className="col-span-2 lg:flex-1">
              <input
                id="origin"
                name="origin"
                list="airports"
                required
                placeholder="From (e.g. DXB)"
                value={originInput}
                onChange={(event) => {
                  setOriginInput(event.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB]"
              />
            </div>

            <div className="col-span-1 flex items-center lg:w-auto lg:flex-none lg:justify-center">
              <button
                type="button"
                onClick={() => {
                  setOriginInput(destinationInput);
                  setDestinationInput(originInput);
                }}
                className="h-9 w-9 rounded-lg border border-[#E2EAF4] text-lg text-slate-400 transition hover:text-[#2563EB]"
                aria-label="Swap origin and destination"
              >
                ⇄
              </button>
            </div>

            <div className="col-span-1 lg:flex-1">
              <input
                id="destination"
                name="destination"
                list="airports"
                required
                placeholder="To (e.g. LHR)"
                value={destinationInput}
                onChange={(event) => {
                  setDestinationInput(event.target.value);
                }}
                className="h-11 w-full rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB]"
              />
            </div>

            <div className="col-span-1 lg:w-[11rem] lg:flex-none">
              <input
                id="departure_date"
                name="departure_date"
                type="date"
                min={today}
                required
                defaultValue={today}
                className="h-11 w-full rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#2563EB]"
              />
            </div>

            <div className="col-span-1 lg:w-[9rem] lg:flex-none">
              <select
                id="passengers"
                name="passengers"
                defaultValue="1"
                className="h-11 w-full rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#2563EB]"
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
              className="col-span-2 h-11 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70 lg:col-span-1 lg:w-auto"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>

            {error ? (
              <p className="col-span-2 text-sm text-red-600" role="alert">
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

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 md:px-6">
        <div className="rounded-2xl border border-[#E2EAF4] bg-white py-3">
          <div className="flex items-center justify-center text-sm text-slate-500">
            <p>600+ Airlines</p>
            <span className="mx-4 h-4 w-px bg-slate-200" />
            <p>100+ Countries</p>
            <span className="mx-4 h-4 w-px bg-slate-200" />
            <p>Pay with USDT</p>
          </div>
        </div>
      </section>
    </main>
  );
}
