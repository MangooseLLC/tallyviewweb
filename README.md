# Tallyview Waitlist

A minimal, ultra-clean waitlist landing page for Tallyview built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Ultra-minimal design**: Clean layout with lots of whitespace, centered content, strong typography
- **Email waitlist**: Simple one-field form with validation
- **Dual persistence**: Saves to Supabase (when configured) or falls back to local JSON file
- **Bot protection**: Honeypot field + in-memory rate limiting (5 requests per IP per minute)
- **Mobile-first**: Fully responsive design
- **Type-safe**: Built with TypeScript and Zod validation

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Zod** (validation)
- **Supabase** (optional database)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:

```bash
npm install
```

2. (Optional) Set up Supabase:

   If you want to save signups to Supabase, create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

   Then add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

   Create a table in your Supabase database:

```sql
CREATE TABLE waitlist_signups (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Storage

The application uses a **dual-persistence strategy**:

### With Supabase (Recommended)

If `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured, signups are saved to the `waitlist_signups` table in Supabase.

### Without Supabase (Fallback)

If environment variables are missing or Supabase fails, signups are automatically saved to `./data/waitlist.json` (created automatically).

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── waitlist/
│   │       └── route.ts          # POST endpoint for waitlist submissions
│   ├── layout.tsx                # Root layout with metadata
│   ├── page.tsx                  # Landing page component
│   └── globals.css               # Global styles
├── lib/
│   ├── supabaseAdmin.ts          # Supabase client initialization
│   └── validators.ts             # Zod email validation schema
├── Brand Assets/                 # Logo files (SVG, PNG, PDF)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Security Features

- **Honeypot field**: Hidden field to catch bots
- **Rate limiting**: Max 5 requests per IP per minute (in-memory)
- **Email validation**: Client-side and server-side validation with Zod
- **Service role key**: Supabase credentials are server-side only

## Building for Production

```bash
npm run build
npm start
```

## Brand

- **Brand color (Navy)**: `#001F3F`
- **Brand color (Gold)**: `#f5ba42`
- **Tagline**: "Follow the money."
- **Logo assets**: Available in `Brand Assets/` folder (SVG, PNG, PDF formats)

## License

Private. All rights reserved.
