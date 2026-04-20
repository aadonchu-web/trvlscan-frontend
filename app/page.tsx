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
    { origin: "", destination: "", date: "", originSelected: null as string | null, destinationSelected: null as string | null },
    { origin: "", destination: "", date: "", originSelected: null as string | null, destinationSelected: null as string | null },
  ]);
  const router = useRouter();

  const [multiCityOriginSuggestions, setMultiCityOriginSuggestions] = useState<AirportSuggestion[][]>([[], []]);
  const [multiCityDestinationSuggestions, setMultiCityDestinationSuggestions] = useState<AirportSuggestion[][]>([[], []]);
  const paxDropdownRef = useRef<HTMLDivElement>(null);

  const tabActiveClass = "bg-[#1B4FFF] text-white shadow-lg shadow-primary/20";
  const tabInactiveClass = "bg-surface-container-high text-on-surface-variant";
  const inputClass =
    "h-14 px-4 bg-surface-container-low rounded-xl border border-outline-variant/30 text-base font-medium text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20";
  const compactSearchButtonClass =
    "h-14 flex-shrink-0 px-6 md:px-8 signature-gradient text-white rounded-xl font-bold text-base shadow-lg shadow-primary/30 active:scale-95 transition-all whitespace-nowrap";

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
      sessionStorage.setItem(
        "searchParams",
        JSON.stringify({ tripType: "multicity", legs: validLegs, passengers: totalPassengers, cabinClass }),
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
      sessionStorage.setItem(
        "searchParams",
        JSON.stringify({
          tripType,
          origin: resolvedOrigin,
          destination: resolvedDestination,
          date,
          returnDate,
          passengers: totalPassengers,
          cabinClass,
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

  const cabinClassLabel =
    cabinClass === "economy"
      ? "Economy"
      : cabinClass === "premium_economy"
        ? "Premium Economy"
        : cabinClass === "business"
          ? "Business"
          : "First";


  return (
    <main className="text-on-surface">
      <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm shadow-primary/5">
        <div className="flex justify-between items-center px-4 md:px-8 lg:px-12 h-20 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-12">
            <span className="text-3xl font-black text-on-surface tracking-tighter font-headline">TRVLscan</span>
            <div className="hidden md:flex gap-8 items-center">
              <a
                className="text-primary font-semibold border-b-2 border-primary py-1 px-1 transition-colors duration-300"
                href="#"
              >
                Flights
              </a>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-on-secondary-container" />
              USDT · TRC-20
            </div>
            <button className="material-symbols-outlined text-outline hover:text-primary transition-all" type="button">
              account_circle
            </button>
          </div>
        </div>
      </nav>

      <section className="pt-44 pb-20 relative overflow-hidden bg-surface-container-low">
        <div className="max-w-screen-2xl mx-auto px-16 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="z-10">
            <h1 className="font-headline font-extrabold tracking-tight text-on-surface leading-[1.1] mb-4 text-6xl md:text-7xl lg:text-8xl xl:text-8xl">
              Fly anywhere.
              <br />
              Pay in <span className="text-primary">crypto.</span>
            </h1>
            <p className="text-xl md:text-xl lg:text-2xl text-on-surface-variant max-w-xl mb-8 leading-relaxed">
              Access global aviation networks and pay instantly with USDT on the world&apos;s most secure travel rails.
            </p>
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
              <button className="flex items-center gap-2 px-10 py-5 text-xl bg-primary text-on-primary rounded-full font-semibold shadow-lg shadow-primary/20" type="button">
                <span className="material-symbols-outlined text-sm">flight</span> Flights
              </button>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="w-full h-[600px] lg:h-[720px] rounded-[2.5rem] rotate-2 shadow-2xl shadow-on-surface/10 overflow-hidden">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjW7nkURgdDC65ucO1OZ6Raq-SzdG4ieOKLi58eh_Uo_1d8O-Bs0l6u4NCYKDETLSy8seCtUa9R7phLoH3wIRxcim6omj04D88cO_6vFM79nUKsZL9t2Y0JU6QGacBg6lpUs-s-CG80kAb1pdl_w_BZIB7jGWTwo0ACY91U_kysZEjJNLTB6tLFBAht-GHs4fc4csncESrIEHelUzuUaqGzd3hKu1bI6YuIQQ2uQMpvbOhA65xxhe4jgPa0f1qt8-30YY3LzK-PC9C"
                alt="Travel hero"
              />
            </div>
            <div className="absolute -bottom-10 -left-12 w-96 h-56 bg-white rounded-3xl p-8 shadow-xl -rotate-6 flex flex-col justify-between border border-white/50">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-outline uppercase tracking-tighter">Verified USDT Payment</span>
                <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
              <div className="text-4xl font-bold font-headline">
                4,281.00 <span className="text-sm font-medium text-outline">USDT</span>
              </div>
              <div className="w-full bg-secondary-container h-1.5 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-secondary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-screen-2xl mx-auto px-16 mt-10 relative z-20">
          <div className="flex gap-2 mb-3 px-2">
          <button
            className={
              tripType === "oneway"
                ? "px-6 py-2.5 rounded-full text-sm font-bold bg-[#1B4FFF] text-white shadow-lg shadow-primary/20"
                : "px-6 py-2.5 rounded-full text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            }
            type="button"
            onClick={() => setTripType("oneway")}
          >
            One Way
          </button>
          <button
            className={
              tripType === "roundtrip"
                ? "px-6 py-2.5 rounded-full text-sm font-bold bg-[#1B4FFF] text-white shadow-lg shadow-primary/20"
                : "px-6 py-2.5 rounded-full text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            }
            type="button"
            onClick={() => setTripType("roundtrip")}
          >
            Round Trip
          </button>
          <button
            className={
              tripType === "multicity"
                ? "px-6 py-2.5 rounded-full text-sm font-bold bg-[#1B4FFF] text-white shadow-lg shadow-primary/20"
                : "px-6 py-2.5 rounded-full text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            }
            type="button"
            onClick={() => setTripType("multicity")}
          >
            Multi-City
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-5 overflow-visible">
          {tripType === "oneway" && (
            <>
              <div className="flex flex-row gap-2 items-center">
                <div className="flex-1 min-w-0 relative">
                  <input
                    id="origin"
                    className={`${inputClass} w-full`}
                    placeholder="From (e.g. DXB)"
                    type="text"
                    value={originQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setOriginQuery(value);
                      setOriginSelected(null);
                      searchAirports(value, setOriginSuggestions);
                    }}
                  />
                  {originSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-2 max-h-[200px] overflow-y-auto rounded-xl bg-white shadow-lg">
                      {originSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.iata_code}-${suggestion.name}`}
                          type="button"
                          className="px-4 py-3 text-sm hover:bg-surface-container-low cursor-pointer w-full text-left"
                          onClick={() => {
                            setOriginQuery(suggestion.name);
                            setOriginSelected(suggestion.iata_code);
                            setOriginSuggestions([]);
                          }}
                        >
                          {suggestion.iata_code} — {suggestion.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="h-12 w-12 flex-shrink-0 flex items-center justify-center bg-surface-container-low rounded-xl border border-outline-variant/30 text-primary hover:bg-primary hover:text-white transition-all"
                  type="button"
                  onClick={() => {
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
                  }}
                >
                  <span className="material-symbols-outlined text-lg">swap_horiz</span>
                </button>

                <div className="flex-1 min-w-0 relative">
                  <input
                    id="destination"
                    className={`${inputClass} w-full`}
                    placeholder="To (e.g. LHR)"
                    type="text"
                    value={destinationQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDestinationQuery(value);
                      setDestinationSelected(null);
                      searchAirports(value, setDestinationSuggestions);
                    }}
                  />
                  {destinationSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-2 max-h-[200px] overflow-y-auto rounded-xl bg-white shadow-lg">
                      {destinationSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.iata_code}-${suggestion.name}`}
                          type="button"
                          className="px-4 py-3 text-sm hover:bg-surface-container-low cursor-pointer w-full text-left"
                          onClick={() => {
                            setDestinationQuery(suggestion.name);
                            setDestinationSelected(suggestion.iata_code);
                            setDestinationSuggestions([]);
                          }}
                        >
                          {suggestion.iata_code} — {suggestion.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-40 flex-shrink-0">
                  <input
                    id="depart"
                    className={`${inputClass} w-40`}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="relative flex-shrink-0" ref={paxDropdownRef}>
                  <button
                    onClick={() => setShowPaxDropdown(!showPaxDropdown)}
                    className="h-12 px-2 md:px-4 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs md:text-sm font-medium text-on-surface flex items-center gap-2 whitespace-nowrap hover:bg-surface-container transition-all"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base text-outline">person</span>
                    {totalPassengers} Passenger{totalPassengers > 1 ? "s" : ""}, {cabinClassLabel}
                    <span className="material-symbols-outlined text-base text-outline">expand_more</span>
                  </button>

                  {showPaxDropdown && (
                    <div className="absolute top-14 right-0 z-50 w-72 bg-white rounded-2xl shadow-xl border border-outline-variant/20 p-4">
                      <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                        <div>
                          <div className="text-sm font-semibold text-on-surface">Adults</div>
                          <div className="text-xs text-outline">Age 12+</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setAdults(Math.max(1, adults - 1))}
                            className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                            type="button"
                          >
                            -
                          </button>
                          <span className="w-4 text-center text-sm font-semibold">{adults}</span>
                          <button
                            onClick={() => setAdults(Math.min(9, adults + 1))}
                            className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                        <div>
                          <div className="text-sm font-semibold text-on-surface">Children</div>
                          <div className="text-xs text-outline">Age 2-11</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setChildren(Math.max(0, children - 1))}
                            className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                            type="button"
                          >
                            -
                          </button>
                          <span className="w-4 text-center text-sm font-semibold">{children}</span>
                          <button
                            onClick={() => setChildren(Math.min(9, children + 1))}
                            className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                        <div>
                          <div className="text-sm font-semibold text-on-surface">Infants</div>
                          <div className="text-xs text-outline">Age 0-1</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setInfants(Math.max(0, infants - 1))}
                            className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                            type="button"
                          >
                            -
                          </button>
                          <span className="w-4 text-center text-sm font-semibold">{infants}</span>
                          <button
                            onClick={() => setInfants(Math.min(9, infants + 1))}
                            className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="pt-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-outline mb-2">Cabin class</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: "economy", label: "Economy" },
                            { value: "premium_economy", label: "Premium Economy" },
                            { value: "business", label: "Business" },
                            { value: "first", label: "First Class" },
                          ].map((cls) => (
                            <button
                              key={cls.value}
                              onClick={() => setCabinClass(cls.value)}
                              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                                cabinClass === cls.value
                                  ? "bg-primary text-white border-primary"
                                  : "bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-primary"
                              }`}
                              type="button"
                            >
                              {cls.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setShowPaxDropdown(false)}
                        className="w-full mt-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-container transition-all"
                        type="button"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>

                <button className={compactSearchButtonClass} type="button" onClick={handleSearch}>
                  SEARCH
                </button>
              </div>

            </>
          )}

          {tripType === "roundtrip" && (
            <div className="flex flex-row flex-nowrap gap-2 items-center">
              <div className="flex-1 min-w-0 relative">
                <input
                  id="origin-roundtrip"
                  className={`${inputClass} w-full`}
                  placeholder="Flying from"
                  type="text"
                  value={originQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setOriginQuery(value);
                    setOriginSelected(null);
                    searchAirports(value, setOriginSuggestions);
                  }}
                />
                {originSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-2 max-h-[200px] overflow-y-auto rounded-xl bg-white shadow-lg">
                    {originSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.iata_code}-${suggestion.name}`}
                        type="button"
                        className="px-4 py-3 text-sm hover:bg-surface-container-low cursor-pointer w-full text-left"
                        onClick={() => {
                          setOriginQuery(suggestion.name);
                          setOriginSelected(suggestion.iata_code);
                          setOriginSuggestions([]);
                        }}
                      >
                        {suggestion.iata_code} — {suggestion.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="h-12 w-12 flex-shrink-0 flex items-center justify-center bg-surface-container-low rounded-xl border border-outline-variant/30 text-primary hover:bg-primary hover:text-white transition-all"
                type="button"
                onClick={() => {
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
                }}
              >
                <span className="material-symbols-outlined">swap_horiz</span>
              </button>

              <div className="flex-1 min-w-0 relative">
                <input
                  id="destination-roundtrip"
                  className={`${inputClass} w-full`}
                  placeholder="Flying to"
                  type="text"
                  value={destinationQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDestinationQuery(value);
                    setDestinationSelected(null);
                    searchAirports(value, setDestinationSuggestions);
                  }}
                />
                {destinationSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-2 max-h-[200px] overflow-y-auto rounded-xl bg-white shadow-lg">
                    {destinationSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.iata_code}-${suggestion.name}`}
                        type="button"
                        className="px-4 py-3 text-sm hover:bg-surface-container-low cursor-pointer w-full text-left"
                        onClick={() => {
                          setDestinationQuery(suggestion.name);
                          setDestinationSelected(suggestion.iata_code);
                          setDestinationSuggestions([]);
                        }}
                      >
                        {suggestion.iata_code} — {suggestion.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-36 flex-shrink-0">
                <input
                  id="depart-roundtrip"
                  className={`${inputClass} w-36`}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="w-36 flex-shrink-0">
                <input
                  id="return-roundtrip"
                  className={`${inputClass} w-36`}
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>

              <div className="w-44 flex-shrink-0 relative" ref={paxDropdownRef}>
                <button
                  onClick={() => setShowPaxDropdown(!showPaxDropdown)}
                  className="h-12 px-2 md:px-4 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs md:text-sm font-medium text-on-surface flex items-center gap-2 whitespace-nowrap hover:bg-surface-container transition-all"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base text-outline">person</span>
                  {totalPassengers} Pax ·{" "}
                  {cabinClass === "economy"
                    ? "Eco"
                    : cabinClass === "premium_economy"
                      ? "Prem"
                      : cabinClass === "business"
                        ? "Biz"
                        : "First"}
                  <span className="material-symbols-outlined text-base text-outline">expand_more</span>
                </button>
                {showPaxDropdown && (
                  <div className="absolute top-14 right-0 z-50 w-72 bg-white rounded-2xl shadow-xl border border-outline-variant/20 p-4">
                    <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                      <div>
                        <div className="text-sm font-semibold text-on-surface">Adults</div>
                        <div className="text-xs text-outline">Age 12+</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                          type="button"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">{adults}</span>
                        <button
                          onClick={() => setAdults(Math.min(9, adults + 1))}
                          className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                      <div>
                        <div className="text-sm font-semibold text-on-surface">Children</div>
                        <div className="text-xs text-outline">Age 2-11</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                          type="button"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">{children}</span>
                        <button
                          onClick={() => setChildren(Math.min(9, children + 1))}
                          className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                      <div>
                        <div className="text-sm font-semibold text-on-surface">Infants</div>
                        <div className="text-xs text-outline">Age 0-1</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setInfants(Math.max(0, infants - 1))}
                          className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                          type="button"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">{infants}</span>
                        <button
                          onClick={() => setInfants(Math.min(9, infants + 1))}
                          className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="pt-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-outline mb-2">Cabin class</div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "economy", label: "Economy" },
                          { value: "premium_economy", label: "Premium Economy" },
                          { value: "business", label: "Business" },
                          { value: "first", label: "First Class" },
                        ].map((cls) => (
                          <button
                            key={cls.value}
                            onClick={() => setCabinClass(cls.value)}
                            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                              cabinClass === cls.value
                                ? "bg-primary text-white border-primary"
                                : "bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-primary"
                            }`}
                            type="button"
                          >
                            {cls.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowPaxDropdown(false)}
                      className="w-full mt-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-container transition-all"
                      type="button"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>

              <button
                className="h-14 flex-shrink-0 px-8 signature-gradient text-white rounded-xl font-bold text-base shadow-lg shadow-primary/30 active:scale-95 transition-all whitespace-nowrap"
                type="button"
                onClick={handleSearch}
              >
                SEARCH
              </button>
            </div>
          )}

          {tripType === "multicity" && (
            <div className="space-y-3">
              {multiCityRows.map((leg, idx) => (
                <div key={idx} className="flex flex-row gap-2 items-center">
                  <div className="flex-1 relative">
                    <input
                      id={`mc-from-${idx}`}
                      className={`${inputClass} w-full`}
                      placeholder="Flying from"
                      type="text"
                      value={leg.origin}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMultiCityLegs((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, origin: value, originSelected: null } : l)),
                        );
                        searchAirports(value, (suggestions: AirportSuggestion[]) => {
                          setMultiCityOriginSuggestions((prev) => prev.map((arr, i) => (i === idx ? suggestions : arr)));
                        });
                      }}
                    />
                    {(multiCityOriginSuggestions[idx] ?? []).length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-2 max-h-[200px] overflow-y-auto rounded-xl bg-white shadow-lg">
                        {(multiCityOriginSuggestions[idx] ?? []).map((suggestion) => (
                          <button
                            key={`${idx}-${suggestion.iata_code}-${suggestion.name}`}
                            type="button"
                            className="px-4 py-3 text-sm hover:bg-surface-container-low cursor-pointer w-full text-left"
                            onClick={() => {
                              setMultiCityLegs((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, origin: suggestion.name, originSelected: suggestion.iata_code } : l,
                                ),
                              );
                              setMultiCityOriginSuggestions((prev) => prev.map((arr, i) => (i === idx ? [] : arr)));
                            }}
                          >
                            {suggestion.iata_code} — {suggestion.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="flex-shrink-0 text-outline text-lg">→</span>

                  <div className="flex-1 relative">
                    <input
                      id={`mc-to-${idx}`}
                      className={`${inputClass} w-full`}
                      placeholder="Flying to"
                      type="text"
                      value={leg.destination}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMultiCityLegs((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, destination: value, destinationSelected: null } : l)),
                        );
                        searchAirports(value, (suggestions: AirportSuggestion[]) => {
                          setMultiCityDestinationSuggestions((prev) => prev.map((arr, i) => (i === idx ? suggestions : arr)));
                        });
                      }}
                    />
                    {(multiCityDestinationSuggestions[idx] ?? []).length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-2 max-h-[200px] overflow-y-auto rounded-xl bg-white shadow-lg">
                        {(multiCityDestinationSuggestions[idx] ?? []).map((suggestion) => (
                          <button
                            key={`${idx}-${suggestion.iata_code}-${suggestion.name}`}
                            type="button"
                            className="px-4 py-3 text-sm hover:bg-surface-container-low cursor-pointer w-full text-left"
                            onClick={() => {
                              setMultiCityLegs((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, destination: suggestion.name, destinationSelected: suggestion.iata_code } : l,
                                ),
                              );
                              setMultiCityDestinationSuggestions((prev) => prev.map((arr, i) => (i === idx ? [] : arr)));
                            }}
                          >
                            {suggestion.iata_code} — {suggestion.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-36 flex-shrink-0">
                    <input
                      id={`mc-date-${idx}`}
                      className={`${inputClass} w-36`}
                      type="date"
                      value={leg.date}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMultiCityLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, date: value } : l)));
                      }}
                    />
                  </div>

                  {idx >= 2 ? (
                    <button
                      type="button"
                      className="h-12 w-12 flex-shrink-0 rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                      onClick={() => {
                        setMultiCityLegs((prev) => prev.filter((_, i) => i !== idx));
                        setMultiCityOriginSuggestions((prev) => prev.filter((_, i) => i !== idx));
                        setMultiCityDestinationSuggestions((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      ×
                    </button>
                  ) : (
                    <div className="flex-shrink-0 h-12 w-12" />
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                  {multiCityLegs.length < 5 && (
                    <button
                      type="button"
                      className="h-12 px-4 rounded-xl border border-outline-variant/30 bg-surface-container-low text-primary font-bold text-sm"
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
                    >
                      + Add another flight
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0" ref={paxDropdownRef}>
                    <button
                      onClick={() => setShowPaxDropdown(!showPaxDropdown)}
                      className="h-12 px-2 md:px-4 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs md:text-sm font-medium text-on-surface flex items-center gap-2 whitespace-nowrap hover:bg-surface-container transition-all"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base text-outline">person</span>
                      {totalPassengers} Passenger{totalPassengers > 1 ? "s" : ""}, {cabinClassLabel}
                      <span className="material-symbols-outlined text-base text-outline">expand_more</span>
                    </button>

                    {showPaxDropdown && (
                      <div className="absolute top-14 right-0 z-50 w-72 bg-white rounded-2xl shadow-xl border border-outline-variant/20 p-4">
                        <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                          <div>
                            <div className="text-sm font-semibold text-on-surface">Adults</div>
                            <div className="text-xs text-outline">Age 12+</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setAdults(Math.max(1, adults - 1))}
                              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                              type="button"
                            >
                              -
                            </button>
                            <span className="w-4 text-center text-sm font-semibold">{adults}</span>
                            <button
                              onClick={() => setAdults(Math.min(9, adults + 1))}
                              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                          <div>
                            <div className="text-sm font-semibold text-on-surface">Children</div>
                            <div className="text-xs text-outline">Age 2-11</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setChildren(Math.max(0, children - 1))}
                              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                              type="button"
                            >
                              -
                            </button>
                            <span className="w-4 text-center text-sm font-semibold">{children}</span>
                            <button
                              onClick={() => setChildren(Math.min(9, children + 1))}
                              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-outline-variant/20">
                          <div>
                            <div className="text-sm font-semibold text-on-surface">Infants</div>
                            <div className="text-xs text-outline">Age 0-1</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setInfants(Math.max(0, infants - 1))}
                              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                              type="button"
                            >
                              -
                            </button>
                            <span className="w-4 text-center text-sm font-semibold">{infants}</span>
                            <button
                              onClick={() => setInfants(Math.min(9, infants + 1))}
                              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all text-lg font-bold"
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="pt-3">
                          <div className="text-xs font-bold uppercase tracking-wider text-outline mb-2">Cabin class</div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: "economy", label: "Economy" },
                              { value: "premium_economy", label: "Premium Economy" },
                              { value: "business", label: "Business" },
                              { value: "first", label: "First Class" },
                            ].map((cls) => (
                              <button
                                key={cls.value}
                                onClick={() => setCabinClass(cls.value)}
                                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                                  cabinClass === cls.value
                                    ? "bg-primary text-white border-primary"
                                    : "bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-primary"
                                }`}
                                type="button"
                              >
                                {cls.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setShowPaxDropdown(false)}
                          className="w-full mt-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-container transition-all"
                          type="button"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                  <button className={compactSearchButtonClass} type="button" onClick={handleSearch}>
                    SEARCH
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-screen-2xl mx-auto px-16 py-12 md:py-16 lg:py-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div className="space-y-2">
            <h2 className="font-headline text-4xl font-extrabold tracking-tight">Trending Destinations</h2>
            <p className="text-on-surface-variant">The most searched routes this month via USDT</p>
          </div>
          <button className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all" type="button">
            View all routes <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[500px] lg:h-[600px]">
          <div className="md:col-span-8 relative rounded-3xl overflow-hidden group cursor-pointer">
            <img
              alt="Sydney Australia"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-mRpT_juKRO2vsIFF2vOC0QZ-v6TlTgyVAFzC__moKC5PssxTnQbkrN_xDThpXP6hfCYwFbXS9FoTSn8wbZtPCcSP06PKo_Vnvb-07GudMKdLf4yY99ipbVN42m6TcT2cfTfXk1wsrJre1FebyT9hkNiykKvVF3yR5QIZaWPtkceos3VIeIVw96SioJ88Koce-0kEK2_O5eI0q8axQvGrDfPVhGiKENUC8jzF_Li4g1p3NKb7kpZG67OCRMGbg1SXIOnYnpUdC96C"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent p-8 flex flex-col justify-end">
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold w-fit mb-3">
                SAVE 15%
              </span>
              <h3 className="text-white text-3xl font-bold">Sydney, Australia</h3>
              <p className="text-white/80">Starting at 1,200 USDT</p>
            </div>
          </div>
          <div className="md:col-span-4 relative rounded-3xl overflow-hidden group cursor-pointer">
            <img
              alt="Agra India"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjDc7G82DKxiwnSB2Z8FIU6Qn_aNszVUvTLlItpsHv1g5FZ4LBXbTtZAxhOoEhvPyvawyGg9aNI7ZpG5perzuRZcMiwnF8q4oNneWOhnnfXAjocJUD9Q7YbZfMoKw4inez--sW2ZnGxVD9zEpcayIEqwqqWf969_YaURlrvOfXw0nCyocG_KPYL-IsLnd7U9EZTaf4-Wqyzp_vkJy2BIOZNrndFpmsLRZpxBKIyVx3Ihd5cB4ZmnB4Pp_rrmvsAqbeBHYaX5AMPRY7"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent p-8 flex flex-col justify-end">
              <h3 className="text-white text-2xl font-bold">Agra, India</h3>
              <p className="text-white/80">Starting at 850 USDT</p>
            </div>
          </div>
          <div className="md:col-span-4 relative rounded-3xl overflow-hidden group cursor-pointer">
            <img
              alt="Kyoto Japan"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_eurmXC_oznTNyS2T_-u6ay1glCgeA-UCCbKayzsk_fVHTcKVuI7OGJdnZ_4EAXfqvkJIKjlpRmF21KnRgXgeiYclkyGnF1d_frUqDaWl_pzSRXXrn1NNiVZAcoivTx1S45LVpUQTQ_k2bdN5SVXS8htk_w6k4kN2sKX6mhPNAia4Z-3M6DDQGt7bJQBNxtXu_UDFKbatTV6CyG46cXn5cxL7IYSlV3LUtA5kPzZpUX3SSofBkCGhjNCEQUoesMJaKgrN7CN4HRPE"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent p-8 flex flex-col justify-end">
              <h3 className="text-white text-2xl font-bold">Kyoto, Japan</h3>
              <p className="text-white/80">Starting at 1,050 USDT</p>
            </div>
          </div>
          <div className="md:col-span-8 relative rounded-3xl overflow-hidden group cursor-pointer">
            <img
              alt="London UK"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAu-ljeNt5vG7joQJyxGke1_HnDFhZ4CkOD3XjfEtJi8vekEQ58qUazP51cgMOPa17qO62Ia8XB1SkQ1c-OZhZ1PrjycBBaoEVybxBBcwLgkDZgHkmjZE9WngL9LnAF3WEufXBnTbKrBhtXket8_ZRGjl9shaC2fLYtIdUMhgdQ_Cclf0MItqWdsedLEm2_gyY13LPCZOl1O7LTt4juYfWyzwoYNQ0oi5xVKfJ9GnUFr_TB8O7u72V1RVzKSTe0ckGTbQl0xwJ5sfSi"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent p-8 flex flex-col justify-end">
              <h3 className="text-white text-3xl font-bold">London, UK</h3>
              <p className="text-white/80">Starting at 920 USDT</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low py-12 md:py-16 lg:py-24 px-16">
        <div className="max-w-screen-2xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-extrabold font-headline tracking-tight mb-4">Precision Booking Service</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">
            Travel redefined for the digital era. Secure, instant, and borderless flight transactions.
          </p>
        </div>
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-500">
            <div className="text-5xl font-black font-headline text-primary/10 mb-6">01</div>
            <h4 className="text-lg font-bold mb-3">Search</h4>
            <p className="text-sm text-outline leading-relaxed">
              Browse thousands of global destinations and luxury flight options in our refined interface.
            </p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-500">
            <div className="text-5xl font-black font-headline text-primary/10 mb-6">02</div>
            <h4 className="text-lg font-bold mb-3">Choose</h4>
            <p className="text-sm text-outline leading-relaxed">
              Select your preferred class and amenities. Our digital platform handles the complexity of your flight.
            </p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-500">
            <div className="text-5xl font-black font-headline text-primary/10 mb-6">03</div>
            <h4 className="text-lg font-bold mb-3">Enter details</h4>
            <p className="text-sm text-outline leading-relaxed">
              Provide passenger information through our secure, encrypted data gateway.
            </p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-500">
            <div className="text-5xl font-black font-headline text-primary/10 mb-6">04</div>
            <h4 className="text-lg font-bold mb-3">Pay in USDT</h4>
            <p className="text-sm text-outline leading-relaxed">
              Complete your booking instantly using USDT via TRC-20 or ERC-20 networks.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-surface py-20 px-16">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            <div className="space-y-6">
              <span className="text-2xl font-black text-on-surface tracking-tighter font-headline">TRVLscan</span>
              <p className="text-outline max-w-xs text-sm leading-relaxed">
                The ultimate digital gateway for the modern traveler. Book global flights with the precision of
                blockchain.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h5 className="font-bold text-sm uppercase tracking-widest text-primary">Service</h5>
                <ul className="space-y-2 text-sm text-on-surface-variant font-medium">
                  <li>
                    <a className="hover:text-primary transition-all" href="#">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-all" href="#">
                      Destinations
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-all" href="#">
                      Booking Policy
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h5 className="font-bold text-sm uppercase tracking-widest text-primary">Support</h5>
                <ul className="space-y-2 text-sm text-on-surface-variant font-medium">
                  <li>
                    <a className="hover:text-primary transition-all" href="#">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-all" href="#">
                      Live Chat
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-all" href="#">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h5 className="font-bold text-sm uppercase tracking-widest text-primary">Legal</h5>
                <ul className="space-y-2 text-sm text-on-surface-variant font-medium">
                  <li>
                    <a className="hover:text-primary transition-all" href="#">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-primary transition-all" href="#">
                      Terms
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-surface-container-high flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-outline text-xs">© 2025 TRVLscan. The Flight Concierge.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
