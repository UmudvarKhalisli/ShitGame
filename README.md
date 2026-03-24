# Shit Game Site

Deliberately frustrating but addictive web experience built with Next.js (App Router), React, TypeScript, and Tailwind CSS.

## Available scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Admin-only stage testing mode

This project now includes a hidden stage testing panel that is locked with a server-side key.

### How it works

- Press `Ctrl + Shift + U` to open the hidden admin prompt.
- Enter the admin key.
- If valid, you can jump to any stage (`1..5` or `Leaderboard`) and mark the current stage as completed for fast testing.
- Other users still play normal step-by-step flow unless they know the key.

### Required env variable

- `ADMIN_BYPASS_KEY`

Copy `.env.example` to `.env.local` for local development and set a strong secret.

## Deploying to Vercel + Supabase

### Vercel env vars

Add these in Vercel Project Settings → Environment Variables:

- `ADMIN_BYPASS_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (only for server-side API usage)

### Supabase notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only (never expose in client code).
- Keep Row Level Security (RLS) enabled on your tables.
- Use `NEXT_PUBLIC_*` only for values safe to expose in browser.
