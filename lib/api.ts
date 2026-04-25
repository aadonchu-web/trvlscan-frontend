import { PassengerData } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

export type FlightSlice = {
  origin: string;
  destination: string;
  departure_date: string;
};

export type BaggageSummary = {
  carry_on: { included: boolean; quantity: number };
  checked: { included: boolean; quantity: number };
};

export type FarePolicy = {
  allowed: boolean;
  penalty_amount: string | null;
  penalty_currency: string | null;
};

export type SimplifiedOffer = {
  id?: string;
  total_amount?: string | number;
  total_currency?: string;
  airline?: { name?: string; iata_code?: string } | string;
  airline_name?: string;
  departure_time?: string;
  arrival_time?: string;
  duration?: string;
  number_of_stops?: number;
  slices?: Record<string, unknown>[];
  fare_brand_name?: string | null;
  cabin_class_marketing_name?: string | null;
  baggage_summary?: BaggageSummary;
  change_policy?: FarePolicy;
  refund_policy?: FarePolicy;
};

export type SearchFlightsParams = {
  origin?: string;
  destination?: string;
  departure_date?: string;
  passengers: number;
  slices?: FlightSlice[];
  cabin_class?: string;
};

export type CreateBookingParams = {
  offerId: string;
  passenger: PassengerData;
};

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function searchFlights(params: SearchFlightsParams) {
  const payload: Record<string, unknown> = {
    passengers: params.passengers,
  };
  if (params.slices) payload.slices = params.slices;
  if (params.cabin_class) payload.cabin_class = params.cabin_class;
  if (params.origin) payload.origin = params.origin;
  if (params.destination) payload.destination = params.destination;
  if (params.departure_date) payload.departure_date = params.departure_date;

  return request("/api/flights/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type PartialSearchParams = {
  slices: FlightSlice[];
  passengers: number;
  cabin_class?: string;
};

export type PartialSearchResponse = {
  partial_offer_request_id: string;
  total_slices: number;
  offers: Record<string, unknown>[];
};

export type SelectPartialOfferResponse = {
  done: boolean;
  total_slices: number;
  selected_count: number;
  offers: Record<string, unknown>[];
};

export type PartialFaresResponse = {
  offers: Record<string, unknown>[];
};

export async function partialSearchFlights(params: PartialSearchParams): Promise<PartialSearchResponse> {
  const payload: Record<string, unknown> = {
    slices: params.slices,
    passengers: params.passengers,
  };
  if (params.cabin_class) payload.cabin_class = params.cabin_class;

  return request<PartialSearchResponse>("/api/flights/partial-search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function selectPartialOffer(params: {
  partial_offer_request_id: string;
  selected_partial_offer_ids: string[];
}): Promise<SelectPartialOfferResponse> {
  return request<SelectPartialOfferResponse>("/api/flights/partial-search/select", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getPartialFares(params: {
  partial_offer_request_id: string;
  selected_partial_offer_ids: string[];
}): Promise<PartialFaresResponse> {
  return request<PartialFaresResponse>("/api/flights/partial-search/fares", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function createBooking(params: CreateBookingParams) {
  const payload = {
    offerId: params.offerId,
    passenger: params.passenger,
  };

  return request("/api/bookings/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPayment(bookingId: string) {
  return request("/api/payments/create", {
    method: "POST",
    body: JSON.stringify({ booking_id: bookingId }),
  });
}

export async function getPaymentStatus(bookingId: string) {
  return request(`/api/payments/status/${bookingId}`);
}
