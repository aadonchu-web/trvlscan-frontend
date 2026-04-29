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

## Design System

Source of truth: `docs/trvlscan-brandbook-v1.html` (open in a browser to view). Treat that file as canonical — this section summarises the rules every UI change must follow.

### Brand positioning
- One-liner: **"Pay in crypto. Fly anywhere."** Skyscanner speed, Wise trust.
- Audience: mass-market stablecoin holders (USDT/USDC, remote workers, restricted-market users) — not just web3 natives.
- Voice: direct, clear, helpful. Never "refined", "curated", "elite", "concierge", "ecosystem".
- "Crypto" vs "USDT on Tron" rule: marketing surfaces use broad terms ("Pay in crypto", "Stablecoins supported"); payment surfaces use precise ones ("Send only USDT on Tron (TRC-20)"). Never lock marketing copy to a single token.

### Color tokens
Core palette — every colour has one job. Never use blue + green as decoration; green appears only when something is confirmed.
- `trvl-blue` `#1B4FFF` — primary CTA, links, focus rings
- `trvl-blue-dark` `#0033C1` — hover states
- `trvl-blue-light` `#4F7BFF` — gradients, accents on dark
- `trvl-blue-50` `#EEF2FF`, `trvl-blue-100` `#DDE5FF` — backgrounds, badges (never use raw `#1B4FFF` as a background)
- `navy` `#0A1B3D` — headlines, body text, dark surfaces, footers
- `navy-soft` `#1A2B4D`
- `usdt-green` `#0FA958` — confirmations, success states, "Verified" pills only
- `usdt-green-light` `#E6F7EE`, `usdt-green-dark` `#087A3F`
- `surface` `#F7F7F8` — page background; `surface-2` `#FFFFFF` — card fills
- Semantic: success `#0FA958`/bg `#E6F7EE`, warning `#D97706`/bg `#FEF3C7`, error `#DC2626`/bg `#FEE2E2`, info `#1B4FFF`/bg `#EEF2FF`

### Typography
Two fonts + mono. Strict hierarchy — no other families.
- **Plus Jakarta Sans** (display) — H1 800/72px/-3.5%, H2 800/48px/-2.5%, H3 700/32px/-2%, H4 700/22px/-1%
- **Inter** (body) — Body 400/16px/1.6, Small 400/13px/1.55
- **JetBrains Mono** — codes, wallet addresses, hashes, technical labels (13px)

### Iconography
- **Lucide only** (`lucide-react`). Line style, **1.5px stroke**, 24px default.
- No filled variants, no Material Symbols, no custom drawings, no emoji as icons.

### Hero treatment
The signature TRVLscan hero is built in two beats — reserved for the homepage.
- Line 1: **"Fly anywhere."** in Deep Navy.
- Line 2: **"Pay in crypto."** in TRVL Blue with a USDT Green underline (`accent-promise` style — linear-gradient under the text).
- Desire first, mechanism second. The green underline is used for this single phrase and never repeated elsewhere on the page.

### Component standards
- Radius: **12px** default (buttons, inputs), **16px** cards, **24px** hero containers, **999px** pills.
- Shadows: diffuse, tinted with navy (e.g. `0 4px 24px rgba(10, 27, 61, 0.06)`), never plain black.
- Borders: 1px, used sparingly — prefer separating with surface luminosity.
- Buttons: Primary (TRVL Blue) once per screen for the main action; Success (USDT Green) only for confirmations; Secondary (surface fill); Ghost (transparent, blue text).
- Form inputs: always show a label above the input; placeholder shows an example, never an instruction. Focus = 2px TRVL Blue outline + white background.
- Pills: green = verified/safe, blue = informational, amber = time-sensitive, neutral = filter/category.
- Status banners: warning (`#FEF3C7`/`#D97706`) and success (`#E6F7EE`/`#087A3F`) — 12px radius, 12/16px padding.

### Imagery
**Use:**
- Flat illustrations of cities/landmarks (limited palette, geometric, friendly — like the destination cards).
- Authentic travel photography — phone at a gate, boarding pass, rooftop view. Unposed, slightly imperfect.
- Real product screenshots in marketing (not faked dashboards).
- Aerial/landscape shots without people — skylines, runways, mountains, oceans.

**Don't:**
- Luxury hotel balconies at sunset (wrong audience).
- AI-generated portraits of "happy customers" (eyes never quite work, erodes trust).
- Crypto clichés — glowing coins, bull/bear figurines, holographic chains, "blockchain" abstract networks.
- Stock-photo handshakes or suit-wearing boardroom meetings.

## Rules
- Secrets in .env.local only, never in code
- sessionStorage for passing offer data between pages
- formatDuration must handle ISO 8601 with days (P1DT8H52M)
