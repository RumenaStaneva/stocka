# Stocka

AI-powered invoice data extraction and management. Upload invoice images or PDFs, and Claude's vision model extracts structured data (vendor, line items, totals, dates) automatically. Optimized for Bulgarian invoices with full Cyrillic support.

## Features

- **Upload & storage** — drag-and-drop JPEG / PNG / WebP / PDF, stored on Vercel Blob with Sharp-based resizing
- **Image quality guardians** — client-side blur detection, brightness analysis, and resolution validation with user-friendly feedback before upload
- **AI extraction** — Claude Haiku 4.5 parses vendor/recipient info, dates, amounts, currency, and line items
- **Bulgarian-aware** — handles Cyrillic, DD.MM.YYYY dates, BGN/EUR, and Bulgarian field labels (Доставчик, Получател, ДДС, etc.)
- **Review workflow** — edit extracted fields and line items before confirming
- **Confirmation dialogs** — reusable modal with danger/warning/info variants, loading states, and keyboard support
- **Dashboard** — search/filter invoices by status, vendor, and invoice number
- **Organization** — hierarchical folders (materialized path) and color-coded tags
- **Mobile-responsive** — collapsible sidebar with hamburger menu, mobile camera upload button, and touch-friendly layouts across all pages
- **Auth** — email/password login with JWT sessions, user-scoped data

## Tech stack

- **Framework:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (Neon serverless)
- **Storage:** Vercel Blob
- **AI:** Anthropic Claude via `@ai-sdk/anthropic`
- **Auth:** JWT (`jose`, `jsonwebtoken`) + bcryptjs
- **Data fetching:** SWR
- **Validation:** Zod

## Getting started

### Prerequisites

- Node.js 18+
- A Neon (or other) PostgreSQL database
- Vercel Blob read/write token
- Anthropic API key

### Install

```bash
npm install
```

### Environment variables

Create a `.env` file in the project root:

```bash
# PostgreSQL (Neon)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Auth
JWT_SECRET=replace-with-a-strong-secret

# File storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Optional — defaults to /api
NEXT_PUBLIC_API_URL=/api
```

### Initialize the database

```bash
node scripts/run-schema.mjs
```

This applies [scripts/001-create-tables.sql](scripts/001-create-tables.sql), which creates the `users`, `folders`, `tags`, `invoices`, `line_items`, and `invoice_tags` tables along with indexes and timestamp triggers.

### Run

```bash
npm run dev      # development
npm run build    # production build
npm start        # production server
npm run lint     # lint
```

Open http://localhost:3000.

## Project structure

```
app/
  api/                # Route handlers (auth, invoices, extract, upload, images)
  (dashboard)/        # Protected dashboard, upload, invoice detail/review
  login/              # Login page
components/
  ui/                 # Base UI primitives (button, card, input, confirm-modal)
  sidebar.tsx         # Navigation with collapsible mobile menu
lib/
  api.ts              # Frontend API client
  auth-context.tsx    # Auth provider
  image-quality.ts    # Client-side image quality analysis
  utils.ts
scripts/
  001-create-tables.sql
  run-schema.mjs
```

Key files:
- [app/api/extract/route.ts](app/api/extract/route.ts) — Claude extraction prompt and logic
- [lib/image-quality.ts](lib/image-quality.ts) — blur, brightness, and resolution checks before upload
- [components/ui/confirm-modal.tsx](components/ui/confirm-modal.tsx) — reusable confirmation dialog
- [lib/api.ts](lib/api.ts) — frontend API client
- [scripts/001-create-tables.sql](scripts/001-create-tables.sql) — database schema
