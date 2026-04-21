# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server at http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint via `next lint` (extends `next/core-web-vitals` + `next/typescript`)

No test framework is configured.

`NEXT_PUBLIC_API_URL` is required at boot (`lib/api.ts` throws if unset). It lives in `.env.local` and points at the Railway-hosted backend.

## Architecture

Next.js 14 App Router SPA for flight search & crypto-payment booking. Every page is a client component (`"use client"`) — there is no server-side data fetching or route handlers in this repo. Data is fetched directly from the Railway backend.

### Booking flow and state handoff

Pages hand state to each other through `sessionStorage`, not through URL params or a shared store:

1. `app/page.tsx` (`/`) — trip-type tabs, airport autocomplete (hits backend's `/api/flights/airports` directly, not through `lib/api.ts`), passenger picker. Writes `searchParams` and routes to `/results`.
2. `app/results/page.tsx` — reads `searchParams`, calls `searchFlights()` to fetch offers, normalizes, applies filters/sort. Redirects to `/` if `searchParams` is missing. On select, writes `selectedOffer` and routes to `/flight-summary`.
3. `app/flight-summary/page.tsx` — displays the chosen offer, baggage upsell step.
4. `app/passenger/page.tsx` — collects passenger details, calls `createBooking`, then routes to `/booking/[id]`.
5. `app/booking/[id]/page.tsx` — calls `createPayment`, shows NOWPayments USDT address + QR (via `qrcode.react`), polls `getPaymentStatus`.

Known `sessionStorage` keys: `searchParams`, `selectedOffer`, `bookingSession`. When adding a step, keep the same pattern — don't introduce Redux/Zustand for one more key. Offers themselves are not cached; `/results` re-fetches on mount.

### Flexible offer shape

Backend offer objects are Duffel-style with inconsistent nesting. Every page that reads them defines its own local `readValue(offer, paths, fallback)` / `readNumber` helpers that walk a list of candidate dotted paths (e.g. `"slices.0.segments.0.marketing_carrier.iata_code"`) and return the first hit. When adding a new field, add it to the path list in each page that needs it rather than reshaping the data upstream — the shape varies per provider.

### API client

`lib/api.ts` wraps `fetch` for `/api/flights/search`, `/api/bookings/create`, `/api/payments/create`, `/api/payments/status/:id`. It snake_cases the payload at the boundary (TypeScript params are camelCase, wire format is snake_case). The airport autocomplete in `app/page.tsx` bypasses this helper and calls the backend URL directly — keep that in mind when changing API plumbing.

### Styling

Tailwind with a custom Material-Design-style color token set in `tailwind.config.ts` (`primary`, `on-primary`, `surface-container-low`, `outline-variant`, etc.). Use those tokens instead of raw hex. Custom utilities `signature-gradient` and `glass-nav` live in `app/globals.css`. Fonts (`Plus Jakarta Sans`, `Inter`, `Material Symbols Outlined`) are pulled from Google Fonts in `app/layout.tsx`; the local Geist `.woff` files under `app/fonts/` are unused. Icons are `<span class="material-symbols-outlined">name</span>`.

### Path alias

`@/*` maps to repo root (`tsconfig.json`), so imports look like `import { createBooking } from "@/lib/api"`.

## Conventions worth preserving

- Pages are intentionally large single files (`app/page.tsx`, `app/results/page.tsx` are each ~60KB). There is no shared `components/` directory yet — don't split them up unless the task calls for it.
- Prices: results page converts GBP → USDT with a live rate plus a 2.5% markup (`getPriceInUsdt` in `app/results/page.tsx`). Preserve the markup when touching pricing.
