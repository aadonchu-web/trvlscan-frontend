"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatDuration(duration: string) {
  if (!duration) return "--";
  const hours = duration.match(/(\d+)H/)?.[1] || "0";
  const mins = duration.match(/(\d+)M/)?.[1] || "0";
  return `${hours}h ${mins}m`;
}

function formatPrice(offer: any) {
  const amount = Number(offer?.total_amount ?? 0);
  const rateRaw =
    sessionStorage.getItem("gbpToUsdtRate") ??
    sessionStorage.getItem("gbp_usdt_rate") ??
    sessionStorage.getItem("currencyRate_GBP_USD");
  const rate = Number(rateRaw);
  if (Number.isFinite(rate) && rate > 0) {
    return `${Math.round(amount * rate)} USDT`;
  }
  return `${amount} GBP`;
}

export default function ResultsPage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [selectedStops, setSelectedStops] = useState<string>("any");
  const [departureTimeFilter, setDepartureTimeFilter] = useState<string>("any");
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const router = useRouter();

  const usdtRate = (() => {
    const rateRaw =
      typeof window !== "undefined"
        ? (sessionStorage.getItem("gbpToUsdtRate") ??
          sessionStorage.getItem("gbp_usdt_rate") ??
          sessionStorage.getItem("currencyRate_GBP_USD"))
        : null;
    const rate = Number(rateRaw);
    return Number.isFinite(rate) && rate > 0 ? rate : 1.27;
  })();

  const filteredOffers = offers.filter((offer) => {
    const amount = Number(offer?.total_amount ?? 0);
    const usdtPrice = Math.round(amount * usdtRate);
    if (usdtPrice > maxPrice) return false;
    if (selectedStops === "nonstop" && offer.number_of_stops !== 0) return false;
    if (selectedStops === "1stop" && offer.number_of_stops !== 1) return false;
    if (departureTimeFilter !== "any" && offer.departure_time) {
      const hour = new Date(offer.departure_time).getHours();
      if (departureTimeFilter === "morning" && (hour < 6 || hour >= 12)) return false;
      if (departureTimeFilter === "afternoon" && (hour < 12 || hour >= 18)) return false;
    }
    if (selectedAirlines.length > 0 && !selectedAirlines.includes(offer.airline.name)) return false;
    return true;
  });

  const availableAirlines = [...new Set(offers.map((o: any) => o.airline.name).filter(Boolean))];

  useEffect(() => {
    const load = async () => {
      try {
        const params = JSON.parse(sessionStorage.getItem("searchParams") || "{}");
        setSearchParams(params);

        const res = await fetch("https://trvlscan-backend-production.up.railway.app/api/flights/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: params.origin,
            destination: params.destination,
            departure_date: params.date,
            passengers: params.passengers || 1,
          }),
        });
        const data = await res.json();
        setOffers(data.offers || []);
        setLoading(false);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="bg-surface font-body text-on-surface">
      <header className="sticky top-0 w-full z-50 bg-white border-b border-[#091c35]/5 shadow-sm">
        <div className="flex items-center justify-between px-6 h-14 w-full max-w-[1440px] mx-auto">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tight text-[#091c35]">TRVLscan</span>
            <nav className="flex gap-6">
              <a className="text-[#1B4FFF] text-sm font-semibold border-b-2 border-[#1B4FFF] pb-1" href="#">
                Flights
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#79fca0] text-[#006d36] px-4 py-1.5 rounded-full text-xs font-bold">
              <span className="text-[10px]">●</span>
              <span>USDT · TRC-20</span>
            </div>
            <span className="material-symbols-outlined text-lg text-[#091c35]/40 cursor-pointer">info</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto flex min-h-screen">
        <aside className="w-80 flex flex-col p-6 gap-6 bg-[#f0f3ff] text-on-surface rounded-2xl border border-outline-variant/20 h-fit font-['Inter'] text-sm sticky top-20">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Filters</h2>
              <p className="text-on-surface-variant/70 text-xs">Narrow your search</p>
            </div>
            <button
              className="text-primary font-semibold hover:underline"
              onClick={() => {
                setMaxPrice(5000);
                setSelectedStops("any");
                setDepartureTimeFilter("any");
                setSelectedAirlines([]);
              }}
            >
              Reset All
            </button>
          </div>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">payments</span> Price Range
                </span>
                <button className="text-xs text-primary">Clear</button>
              </div>
              <div className="px-2">
                <input
                  className="w-full h-1.5 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary"
                  max="5000"
                  min="100"
                  type="range"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                />
                <div className="flex justify-between mt-2 text-xs font-medium opacity-60">
                  <span>100 USDT</span>
                  <span>{maxPrice} USDT</span>
                </div>
              </div>
            </div>
            <div>
              <span className="font-semibold flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">schedule</span> Departure Time
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDepartureTimeFilter(departureTimeFilter === "morning" ? "any" : "morning")}
                  className={
                    departureTimeFilter === "morning"
                      ? "px-3 py-2 bg-primary text-white rounded-xl text-left"
                      : "px-3 py-2 bg-surface-container-lowest rounded-xl text-left hover:bg-surface-container-highest transition-all"
                  }
                >
                  <span className="block text-[10px] opacity-60 uppercase tracking-wider">Morning</span>
                  <span className="font-medium">06:00 - 12:00</span>
                </button>
                <button
                  onClick={() => setDepartureTimeFilter(departureTimeFilter === "afternoon" ? "any" : "afternoon")}
                  className={
                    departureTimeFilter === "afternoon"
                      ? "px-3 py-2 bg-primary text-white rounded-xl text-left"
                      : "px-3 py-2 bg-surface-container-lowest rounded-xl text-left hover:bg-surface-container-highest transition-all"
                  }
                >
                  <span className="block text-[10px] opacity-60 uppercase tracking-wider">Afternoon</span>
                  <span className="font-medium">12:00 - 18:00</span>
                </button>
              </div>
            </div>
            <div>
              <span className="font-semibold flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">alt_route</span> Stops
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStops("any")}
                  className={
                    selectedStops === "any"
                      ? "px-4 py-2 bg-white text-primary font-semibold rounded-xl"
                      : "px-4 py-2 hover:bg-white/50 rounded-xl transition-all"
                  }
                >
                  Any
                </button>
                <button
                  onClick={() => setSelectedStops("nonstop")}
                  className={
                    selectedStops === "nonstop"
                      ? "px-4 py-2 bg-white text-primary font-semibold rounded-xl"
                      : "px-4 py-2 hover:bg-white/50 rounded-xl transition-all"
                  }
                >
                  Nonstop
                </button>
                <button
                  onClick={() => setSelectedStops("1stop")}
                  className={
                    selectedStops === "1stop"
                      ? "px-4 py-2 bg-white text-primary font-semibold rounded-xl"
                      : "px-4 py-2 hover:bg-white/50 rounded-xl transition-all"
                  }
                >
                  1 stop
                </button>
              </div>
            </div>
            <div>
              <span className="font-semibold flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">flight_takeoff</span> Airlines
              </span>
              <div className="space-y-3">
                {availableAirlines.map((airline: string) => (
                  <label key={airline} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                      checked={selectedAirlines.includes(airline)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedAirlines([...selectedAirlines, airline]);
                        else setSelectedAirlines(selectedAirlines.filter((a) => a !== airline));
                      }}
                    />
                    <span className="flex-1 text-sm">{airline}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="font-semibold flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">hub</span> Airports
              </span>
              <button className="w-full text-left px-4 py-3 bg-surface-container-lowest rounded-xl flex justify-between items-center group">
                <span>Select preferred hubs</span>
                <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">chevron_right</span>
              </button>
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <div className="sticky top-14 z-40 bg-surface-container-low border-b border-surface-container-high px-8 py-3">
            <div className="flex items-center gap-4 max-w-[1440px] mx-auto">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="material-symbols-outlined text-primary text-base">flight_takeoff</span>
                <span className="text-base font-bold text-on-surface">{searchParams?.origin}</span>
              </div>

              <span className="material-symbols-outlined text-outline text-base">arrow_right_alt</span>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="material-symbols-outlined text-primary text-base">flight_land</span>
                <span className="text-base font-bold text-on-surface">{searchParams?.destination}</span>
              </div>

              <div className="h-5 w-px bg-outline-variant/40 mx-2" />

              <span className="text-sm font-medium text-on-surface">{searchParams?.date}</span>

              <div className="h-5 w-px bg-outline-variant/40 mx-2" />

              <span className="text-sm font-medium text-on-surface">
                {searchParams?.passengers || 1} Passenger{searchParams?.passengers > 1 ? "s" : ""}
              </span>

              <div className="h-5 w-px bg-outline-variant/40 mx-2" />

              <button
                onClick={() => router.push("/")}
                className="ml-auto px-4 py-1.5 border border-outline-variant rounded-full text-sm font-semibold text-primary hover:bg-surface-container transition-colors"
              >
                Edit search
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-8 py-3">
            <p className="text-sm text-on-surface-variant">{filteredOffers.length} results found</p>
            <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-xl">
              <span className="text-xs font-semibold uppercase tracking-widest opacity-60">Sort by</span>
              <select className="bg-transparent border-none p-0 pr-8 text-sm font-bold focus:ring-0 cursor-pointer">
                <option>Cheapest Price</option>
                <option>Shortest Duration</option>
                <option>Early Departure</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
              <p className="text-lg font-semibold mb-4">Something went wrong. Please try again.</p>
              <button className="bg-primary-container text-on-primary-container px-8 py-3 rounded-full font-bold hover:opacity-90 transition-opacity" onClick={() => router.push("/")}>
                Back to search
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-6 px-8 pb-8">
              <div className="animate-pulse bg-surface-container-lowest rounded-3xl p-6 h-32" />
              <div className="animate-pulse bg-surface-container-lowest rounded-3xl p-6 h-32" />
              <div className="animate-pulse bg-surface-container-lowest rounded-3xl p-6 h-32" />
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
              <p className="text-lg font-semibold mb-4">No flights found for this route.</p>
              <button className="bg-primary-container text-on-primary-container px-8 py-3 rounded-full font-bold hover:opacity-90 transition-opacity" onClick={() => router.push("/")}>
                Modify search
              </button>
            </div>
          ) : (
            <div className="space-y-6 px-8 pb-8">
              {filteredOffers.map((offer) => {
                const departureTime = new Date(offer.departure_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                const arrivalTime = new Date(offer.arrival_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                const origin = offer?.segments?.[0]?.origin ?? searchParams?.origin ?? "---";
                const destination =
                  offer?.segments?.[offer?.segments?.length - 1]?.destination ?? searchParams?.destination ?? "---";
                const segmentCarrierCode = offer?.segments?.[0]?.marketing_carrier?.code;
                const segmentCarrierName = offer?.segments?.[0]?.marketing_carrier?.name;
                const segmentLine =
                  segmentCarrierCode && segmentCarrierName
                    ? `${segmentCarrierCode}-${segmentCarrierName.substring(0, 3)}`
                    : null;

                return (
                  <div key={offer.id} className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_40px_rgba(9,28,53,0.04)] hover:shadow-[0_12px_40px_rgba(9,28,53,0.08)] transition-all overflow-hidden">
                    <div className="flex items-stretch divide-x divide-surface-container w-full">
                      <div className="flex items-center gap-3 px-6 py-5 w-48">
                        <div className="flex items-center justify-center overflow-hidden">
                          {offer?.airline?.logo_url ? (
                            <img src={offer.airline.logo_url} className="w-10 h-10 object-contain rounded-lg" alt={offer.airline.name} />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                              {offer?.airline?.name?.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-base">{offer?.airline?.name ?? "Airline"}</h3>
                          {segmentLine ? <p className="text-xs text-on-surface-variant">{segmentLine}</p> : null}
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-between px-8 py-5">
                        <div className="text-center">
                          <span className="text-xl font-bold block">{departureTime}</span>
                          <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">{origin}</span>
                        </div>
                        <div className="flex-1 max-w-[200px] flex flex-col items-center gap-2 px-4">
                          <span className="text-xs font-medium text-on-surface-variant mb-2">{formatDuration(offer.duration)}</span>
                          <div className="w-full h-[2px] bg-outline-variant relative">
                            <div className="absolute -top-1.5 -left-1 w-3 h-3 rounded-full border-2 border-outline-variant bg-white" />
                            <div className="absolute -top-1.5 -right-1 w-3 h-3 rounded-full border-2 border-outline-variant bg-white" />
                            <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white px-1 text-sm">flight</span>
                          </div>
                          {offer.number_of_stops === 0 ? (
                            <span className="text-xs font-bold text-secondary mt-2">Non-stop</span>
                          ) : (
                            <span className="text-xs font-bold text-on-surface-variant/60 mt-2">
                              {offer.number_of_stops} stop
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <span className="text-xl font-bold block">{arrivalTime}</span>
                          <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">{destination}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-3 px-6 py-5 w-44">
                        <div className="text-center">
                          <span className="text-2xl font-black text-primary block">{formatPrice(offer)}</span>
                          <span className="text-xs text-on-surface-variant">
                            {offer?.total_amount ?? "-"} {offer?.total_currency ?? "GBP"}
                          </span>
                        </div>
                        <button
                          className="w-full bg-primary-container text-on-primary-container px-6 py-2.5 rounded-full font-bold hover:opacity-90 transition-opacity text-sm"
                          onClick={() => {
                            sessionStorage.setItem("selectedOffer", JSON.stringify(offer));
                            router.push("/passenger");
                          }}
                        >
                          Select
                        </button>
                        <button
                          onClick={() => setExpandedOffer(expandedOffer === offer.id ? null : offer.id)}
                          className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                        >
                          See flight details
                          <span className={`material-symbols-outlined text-sm ${expandedOffer === offer.id ? "rotate-180" : ""}`}>expand_more</span>
                        </button>
                      </div>
                    </div>

                    {expandedOffer === offer.id && (
                      <div className="bg-surface-container-low p-8 mt-6 rounded-2xl">
                        <div className="max-w-2xl mx-auto space-y-0 relative">
                          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-outline-variant/30" />
                          <div className="relative pl-8 pb-10">
                            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary ring-4 ring-primary-fixed" />
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-base">{origin}</h4>
                                <p className="text-sm text-on-surface-variant">Departure: {departureTime}</p>
                              </div>
                              <span className="text-xs font-bold px-3 py-1 bg-surface-container-highest rounded-full">
                                {formatDuration(offer.duration)}
                              </span>
                            </div>
                          </div>
                          <div className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary ring-4 ring-primary-fixed" />
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-base">{destination}</h4>
                                <p className="text-sm text-on-surface-variant">Arrival: {arrivalTime}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-6 w-full bg-[#f9f9ff] border-t border-[#091c35]/10">
        <div className="flex flex-col gap-2">
          <span className="text-lg font-black text-[#1B4FFF]">TRVLscan</span>
          <p className="text-xs uppercase tracking-widest text-[#091c35] opacity-60">© 2025 TRVLscan. Secured by USDT.</p>
        </div>
        <div className="flex gap-8">
          <a className="text-xs uppercase tracking-widest text-[#091c35] opacity-60 hover:opacity-100 transition-opacity" href="#">
            Privacy Policy
          </a>
          <a className="text-xs uppercase tracking-widest text-[#091c35] opacity-60 hover:opacity-100 transition-opacity" href="#">
            Terms of Service
          </a>
          <a className="text-xs uppercase tracking-widest text-[#091c35] opacity-60 hover:opacity-100 transition-opacity" href="#">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}
