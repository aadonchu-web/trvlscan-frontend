# TRVLscan Frontend

Next.js 14 flight booking UI with USDT crypto payment.

## Tech Stack
- Next.js 14 + TypeScript + Tailwind CSS
- qrcode.react for payment QR codes
- API client in lib/api.ts → NEXT_PUBLIC_API_URL

## Commands
- `npm run dev` — start on localhost:3001
- `git add . && git commit -m "msg" && git push` — deploy (Vercel auto-deploys from main)

## Pages
- app/page.tsx — home, search form (Travala-inspired hero)
- app/results/page.tsx — flight cards with USDT prices
- app/passenger/page.tsx — passenger details form
- app/booking/[id]/page.tsx — payment page (QR, timer, copy wallet)

## Multi-step search (round trip / multi city)

Round trip and multi city use Duffel's partial offer flow — pick one slice at a time. One Way still uses the single-shot search.

- `POST /api/flights/search` — One Way only. Returns full `SimplifiedOffer[]`.
- `POST /api/flights/partial-search` — start partial flow.
  - req: `{ slices, passengers, cabin_class }`
  - res: `{ partial_offer_request_id, total_slices, offers: SimplifiedPartialOffer[] }` (offers for slice 1)
- `POST /api/flights/partial-search/select` — pick slice(s), get next slice's offers.
  - req: `{ partial_offer_request_id, selected_partial_offer_ids }`
  - res: `{ done: false, total_slices, selected_count, offers }`
- `POST /api/flights/partial-search/fares` — after final slice, fetch bookable fares.
  - req: `{ partial_offer_request_id, selected_partial_offer_ids }`
  - res: `{ offers: SimplifiedOffer[] }`

Client functions in `lib/api.ts`: `searchFlights`, `partialSearchFlights`, `selectPartialOffer`, `getPartialFares`.

`SimplifiedPartialOffer` matches `SimplifiedOffer` plus a top-level `slice: { origin, destination }` and `partial: true` flag.

## Design Preferences
- Fonts: Plus Jakarta Sans, Inter
- Light color theme, compact forms
- Material Design 3 tokens
- Sans-serif only

## Rules
- Secrets in .env.local only, never in code
- sessionStorage for passing offer data between pages
- formatDuration must handle ISO 8601 with days (P1DT8H52M)
