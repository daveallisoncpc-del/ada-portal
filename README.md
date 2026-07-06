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
- Placeholder instructor and learner logins
- Learner-only portal view
- Instructor master dashboard for learner management
- Local browser fallback
- Vercel-ready static deployment

## Placeholder Logins

These are built into the demo so the portal can be tested immediately.

- Instructor: `dave@allisondriveracademy.co.uk` / `Instructor123!`
- Learner: `john@example.com` / `Pass1234!`

Instructors can create learners and generate placeholder login details from the dashboard. Learners are routed to the learner portal and only see their own record.

## Supabase Setup

Run `supabase-schema.sql` in the Supabase SQL editor.

Then copy these values into Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Both values are public client configuration values. Do not use the service role key in Vercel for this frontend.

The schema includes role-aware tables for a production permissions model:

- `profiles` stores whether a signed-in user is an instructor or learner.
- `learner_records` stores learner data and links each learner to an instructor.
- Row-level security lets instructors access their own learners and learners access their own learner record only.
- `portal_states` remains available for the current demo sync/fallback flow.

## Vercel Setup

Import the GitHub repository into Vercel and use the default settings.

No build command is required. The app is static HTML with a small `/api/config` endpoint.
