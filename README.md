# Allison Driver Academy Portal

Deployable version of the ADA Complete Master Sheet.

## Features

- Master dashboard
- Multiple learner records
- 27 skills tracker
- Lesson records and private practice
- Clickable DL25-style mock test report
- Readiness score
- Supabase sign-in and cloud sync
- Local browser fallback
- Vercel-ready static deployment

## Supabase Setup

Run `supabase-schema.sql` in the Supabase SQL editor.

Then copy these values into Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Both values are public client configuration values. Do not use the service role key in Vercel for this frontend.

## Vercel Setup

Import the GitHub repository into Vercel and use the default settings.

No build command is required. The app is static HTML with a small `/api/config` endpoint.
