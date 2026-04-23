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

## Design Preferences
- Fonts: Plus Jakarta Sans, Inter
- Light color theme, compact forms
- Material Design 3 tokens
- Sans-serif only

## Rules
- Secrets in .env.local only, never in code
- sessionStorage for passing offer data between pages
- formatDuration must handle ISO 8601 with days (P1DT8H52M)
