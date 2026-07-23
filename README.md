# XSEL Admin Portal

Admin portal for the XSEL learning platform. Built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## Prerequisites

- Node.js 18+
- Supabase project (same as the mobile app at `../xSEL`)
- Staff account with `admin` or `manager` role in `profiles`

## Install & run

```bash
cd xsel-admin
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

## Database migrations

1. In Supabase SQL Editor, run the base schema from the mobile app if not already applied:
   - `../xSEL/supabase/schema.sql` (profiles, roles, RLS helpers)

2. Run admin portal migrations in order:
   - `supabase/migrations/20250616000000_course_platform.sql`
   - `supabase/migrations/20250616000001_storage_buckets.sql`

Or apply via Supabase CLI:

```bash
supabase db push
```

## Create first admin user

1. Sign up in the mobile app or Supabase Auth dashboard.
2. Promote the user in SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

Only `admin` and `manager` roles can access this portal.

## Seed sample courses

The seed script imports course data from the mobile app's `courses.js` mock data.

```bash
# Add SUPABASE_SERVICE_ROLE_KEY to .env.local (server-side only, never commit)
npm run seed
```

This creates published sample courses with chapters and lessons. Instructor profiles are matched by name when possible.

## Project structure

```
src/
  app/
    (admin)/          # Protected admin pages
    login/            # Auth page
    actions.ts        # Server actions
  components/         # UI components
  lib/
    db/               # Typed data access layer
    supabase/         # Supabase clients + middleware
  types/              # TypeScript types
supabase/migrations/  # SQL migrations + RLS
scripts/seed.ts       # Sample data seeder
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import project in Vercel.
3. In Vercel → Project → Settings → Environment Variables, set the **same** values as `.env.local` (Vercel does **not** read `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co` (full URL, not just the project ref)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Do **not** add the service role key to Vercel.

Ensure Supabase Auth redirect URLs include your Vercel domain.

## Security

- Frontend uses **anon key only** — all access is enforced by Row Level Security.
- Service role key is only for local seed scripts, never bundled in the app.
