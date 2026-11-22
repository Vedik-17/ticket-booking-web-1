# Deploying FIREFLY V1 to Vercel

## 1. Prerequisites
- Vercel account
- Supabase Project (PostgreSQL + Auth)
- Razorpay account (Key ID + Key Secret)

---

## 2. Monorepo Project Settings on Vercel

When importing the FIREFLY repository on Vercel:

1. **Root Directory:** Set Root Directory to `apps/v1` (or leave as root and specify Root Directory in Vercel project settings).
2. **Framework Preset:** `Next.js`
3. **Build Command:** `npm run build`
4. **Install Command:** `npm install`

---

## 3. Environment Variables

Configure the following environment variables in the Vercel Dashboard under **Settings -> Environment Variables**:

| Variable Name | Environment | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | Full production URL (e.g. `https://firefly.live`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Public anon API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Secret service role key (Never expose to browser) |
| `PAYMENT_PROVIDER` | Production, Preview | Set to `RAZORPAY` (or `MOCK` for staging/preview) |
| `RAZORPAY_KEY_ID` | Production | Razorpay Live API Key ID |
| `RAZORPAY_KEY_SECRET` | Production | Razorpay Live API Secret Key |
| `RAZORPAY_WEBHOOK_SECRET` | Production | Secret configured in Razorpay Webhooks dashboard |
| `FIREFLY_TICKET_SECRET` | Production | High-entropy 256-bit string used to sign QR tokens |

---

## 4. Database Setup on Supabase

1. Open your Supabase project SQL Editor.
2. Run `infrastructure/database/migrations/001_initial_schema.sql`.
3. Run `infrastructure/database/migrations/002_functions_and_triggers.sql`.
4. Run `infrastructure/database/migrations/003_rls_policies.sql`.
5. (Optional) Run `infrastructure/database/seeds/001_demo_seed.sql` to populate sample live events and demo organizer accounts.

