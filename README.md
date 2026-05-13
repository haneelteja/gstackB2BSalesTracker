# gstack B2B Sales Tracker

B2B AI-assisted sales CRM (Next.js 16, Supabase, Anthropic Claude, Resend). **This repo uses [Bun](https://bun.sh) only** — use `bun.lock`, not npm/yarn/pnpm lockfiles.

## Setup

```bash
git clone https://github.com/haneelteja/gstackB2BSalesTracker.git
cd gstackB2BSalesTracker
bun install
```

Copy [`.env.example`](./.env.example) to `.env.local` and fill values (Supabase, Anthropic, Resend; optional WhatsApp keys in the example file).

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel

The build can succeed even when Supabase env vars are missing; **middleware still needs them at runtime**. In the Vercel project, set **Production** and **Preview**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` **or** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new Supabase publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` (service role JWT or new secret key)
- Plus `ANTHROPIC_API_KEY`, `RESEND_*`, etc. as in [`.env.example`](./.env.example)

Then **Redeploy**. If the app shows a config error, the message lists which variables are missing.

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `bun dev`     | Development server |
| `bun run build` | Production build   |
| `bun start`   | Run production build locally |
| `bun run lint` | ESLint            |

## Links

- Production: [gstack-b2b-sales-tracker.vercel.app](https://gstack-b2b-sales-tracker.vercel.app)
- Repository: [github.com/haneelteja/gstackB2BSalesTracker](https://github.com/haneelteja/gstackB2BSalesTracker)
