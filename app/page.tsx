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
  const today = new Date().toISOString().split("T")[0];
  const nextDayDate = new Date();
  nextDayDate.setDate(nextDayDate.getDate() + 1);
  const nextDay = nextDayDate.toISOString().split("T")[0];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip" | "multiCity">("oneWay");
  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [multiFlights, setMultiFlights] = useState([
    { id: 1, origin: "", destination: "", date: today },
    { id: 2, origin: "", destination: "", date: nextDay },
  ]);
  const airports = [
    "SFO - San Francisco International",
    "LAX - Los Angeles International",
    "JFK - John F. Kennedy International",
    "LHR - London Heathrow",
    "NRT - Tokyo Narita",
    "SYD - Sydney Kingsford Smith",
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const passengers = Number(formData.get("passengers") ?? 1);

      if (tripType === "multiCity") {
        const normalizedFlights = multiFlights.map((flight) => ({
          ...flight,
          origin: extractAirportCode(flight.origin),
          destination: extractAirportCode(flight.destination),
        }));
        const firstFlight = normalizedFlights[0];
        if (!firstFlight?.origin || !firstFlight?.destination || !firstFlight?.date) {
          throw new Error("Please complete at least the first multi-city flight.");
        }
        sessionStorage.setItem("multiCityFlights", JSON.stringify(normalizedFlights));
        sessionStorage.setItem("searchOffers", JSON.stringify([]));
        sessionStorage.setItem(
          "searchParams",
          JSON.stringify({
            origin: firstFlight.origin,
            destination: firstFlight.destination,
            departure_date: firstFlight.date,
            passengers,
          }),
        );
        const response = await searchFlights({
          origin: firstFlight.origin,
          destination: firstFlight.destination,
          departure_date: firstFlight.date,
          passengers,
        });
        const offers = Array.isArray(response)
          ? (response as FlightOffer[])
          : (response as { offers?: FlightOffer[] }).offers ?? [];
        sessionStorage.setItem("searchOffers", JSON.stringify(offers));
        router.push("/results");
      } else {
        const origin = extractAirportCode(String(formData.get("origin") ?? ""));
        const destination = extractAirportCode(String(formData.get("destination") ?? ""));
        const departure_date = String(formData.get("departure_date") ?? "");
        sessionStorage.setItem(
          "searchParams",
          JSON.stringify({ origin, destination, departure_date, passengers }),
        );
        const response = await searchFlights({ origin, destination, departure_date, passengers });
        const offers = Array.isArray(response)
          ? (response as FlightOffer[])
          : (response as { offers?: FlightOffer[] }).offers ?? [];
        sessionStorage.setItem("searchOffers", JSON.stringify(offers));
        router.push("/results");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to search flights. Please try again.",
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
          <form onSubmit={handleSubmit}>
            <div className="mb-3 flex items-center gap-5">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
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
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
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
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                <input
                  type="radio"
                  name="tripType"
                  value="multiCity"
                  checked={tripType === "multiCity"}
                  onChange={() => {
                    setTripType("multiCity");
                  }}
                  className="h-3.5 w-3.5 accent-[#2563EB]"
                />
                Multi-city
                {tripType === "multiCity" ? <span className="text-xs text-slate-400">Coming soon</span> : null}
              </label>
            </div>

            {tripType === "multiCity" ? (
              <>
                <div className="space-y-2">
                  {multiFlights.map((flight, index) => (
                    <div
                      key={flight.id}
                      className="flex items-center gap-2 rounded-xl border border-[#E2EAF4] bg-[#F8FAFF] px-4 py-3"
                    >
                      <span className="w-14 flex-shrink-0 text-xs font-semibold text-slate-400">
                        Flight {index + 1}
                      </span>
                      <input
                        list="airports"
                        required
                        placeholder="From (e.g. DXB)"
                        value={flight.origin}
                        onChange={(event) => {
                          setMultiFlights((prev) =>
                            prev.map((item) =>
                              item.id === flight.id ? { ...item, origin: event.target.value } : item,
                            ),
                          );
                        }}
                        className="h-10 flex-1 rounded-lg border border-[#E2EAF4] bg-white px-3 text-sm outline-none transition focus:border-[#2563EB]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMultiFlights((prev) =>
                            prev.map((item) =>
                              item.id === flight.id
                                ? {
                                    ...item,
                                    origin: flight.destination,
                                    destination: flight.origin,
                                  }
                                : item,
                            ),
                          );
                        }}
                        className="h-9 w-9 rounded-lg border border-[#E2EAF4] text-lg text-slate-400 transition hover:text-[#2563EB]"
                        aria-label={`Swap flight ${index + 1} origin and destination`}
                      >
                        ⇄
                      </button>
                      <input
                        list="airports"
                        required
                        placeholder="To (e.g. LHR)"
                        value={flight.destination}
                        onChange={(event) => {
                          setMultiFlights((prev) =>
                            prev.map((item) =>
                              item.id === flight.id ? { ...item, destination: event.target.value } : item,
                            ),
                          );
                        }}
                        className="h-10 flex-1 rounded-lg border border-[#E2EAF4] bg-white px-3 text-sm outline-none transition focus:border-[#2563EB]"
                      />
                      <input
                        type="date"
                        required
                        min={today}
                        value={flight.date}
                        onChange={(event) => {
                          setMultiFlights((prev) =>
                            prev.map((item) =>
                              item.id === flight.id ? { ...item, date: event.target.value } : item,
                            ),
                          );
                        }}
                        className="h-10 rounded-lg border border-[#E2EAF4] bg-white px-3 text-sm outline-none transition focus:border-[#2563EB]"
                      />
                      {index > 0 && multiFlights.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMultiFlights((prev) => prev.filter((item) => item.id !== flight.id));
                          }}
                          className="text-slate-300 transition hover:text-red-400"
                          aria-label={`Remove flight ${index + 1}`}
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMultiFlights((prev) => {
                      if (prev.length >= 5) {
                        return prev;
                      }
                      const baseDate = prev[prev.length - 1]?.date || today;
                      const nextDate = new Date(baseDate);
                      nextDate.setDate(nextDate.getDate() + 1);
                      return [
                        ...prev,
                        {
                          id: Date.now(),
                          origin: "",
                          destination: "",
                          date: nextDate.toISOString().split("T")[0],
                        },
                      ];
                    });
                  }}
                  className="mt-2 text-sm font-medium text-[#2563EB]"
                >
                  + Add another flight
                </button>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <select
                    id="passengers"
                    name="passengers"
                    defaultValue="1"
                    className="h-11 w-48 rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#2563EB]"
                  >
                    {Array.from({ length: 9 }, (_, idx) => idx + 1).map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-11 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? "Searching..." : "Search"}
                  </button>
                </div>
              </>
            ) : (
              <div
                className={`grid grid-cols-2 gap-3 lg:items-center lg:gap-2 ${
                  tripType === "roundTrip"
                    ? "lg:grid-cols-[1fr_auto_1fr_auto_auto_auto_auto]"
                    : "lg:grid-cols-[1fr_auto_1fr_auto_auto_auto]"
                }`}
              >
                <div className="col-span-2 min-w-0 lg:col-span-1">
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
                    className="h-11 w-full min-w-0 rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB]"
                  />
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setOriginInput(destinationInput);
                      setDestinationInput(originInput);
                    }}
                    className="h-9 w-9 flex-shrink-0 rounded-lg border border-[#E2EAF4] text-lg text-slate-400 transition hover:text-[#2563EB]"
                    aria-label="Swap origin and destination"
                  >
                    ⇄
                  </button>
                </div>

                <div className="col-span-1 min-w-0">
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
                    className="h-11 w-full min-w-0 rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] placeholder:text-slate-400 outline-none transition focus:border-[#2563EB]"
                  />
                </div>

                <div className="col-span-1">
                  <input
                    id="departure_date"
                    name="departure_date"
                    type="date"
                    min={today}
                    required
                    defaultValue={today}
                    className="h-11 w-36 flex-shrink-0 rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#2563EB]"
                  />
                </div>

                {tripType === "roundTrip" ? (
                  <div className="col-span-1">
                    <input
                      id="return_date"
                      name="return_date"
                      type="date"
                      min={today}
                      defaultValue={nextDay}
                      placeholder="Return"
                      className="h-11 w-36 flex-shrink-0 rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#2563EB]"
                    />
                  </div>
                ) : null}

                <div className="col-span-1">
                  <select
                    id="passengers"
                    name="passengers"
                    defaultValue="1"
                    className="h-11 w-24 flex-shrink-0 rounded-xl border border-[#E2EAF4] px-3 text-sm text-[#0B1F3A] outline-none transition focus:border-[#2563EB]"
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
                  className="col-span-2 h-11 flex-shrink-0 rounded-xl bg-[#2563EB] px-6 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70 lg:col-span-1"
                >
                  {isLoading ? "Searching..." : "Search"}
                </button>
              </div>
            )}

            {error ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
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
