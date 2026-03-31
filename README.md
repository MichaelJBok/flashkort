# Svenska Flashkort

Spaced-repetition flashcard app for Swedish vocabulary.
Stack: React + Vite · Supabase (Auth + Postgres) · Vercel

---

## Setup

### 1. Supabase

1. Create a new project at https://supabase.com
2. Go to **SQL Editor → New query**, paste the entire contents of
   `supabase-schema.sql`, and click **Run**.
3. Go to **Authentication → Providers → Email** and make sure
   **"Enable email confirmations"** is OFF (magic links handle this).
4. Go to **Authentication → Users** and manually add each user's email address
   via **"Invite user"** — the app uses `shouldCreateUser: false` so only
   pre-added emails can sign in.
5. Copy your project URL and anon key from
   **Project Settings → API**.

### 2. Local development

```bash
git clone <your-repo>
cd flashkort

cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

### 3. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add the two environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The `vercel.json` already handles SPA routing.

---

## Project structure

```
src/
  lib/
    supabase.js     # Supabase client singleton
    srs.js          # Pure spaced-repetition logic + import parsing
  hooks/
    useAuth.js      # Auth state, magic link send, sign out
    useCards.js     # All card/progress data — load, answer, edit, delete, import
  screens/
    AuthScreen.jsx
    StudyScreen.jsx
    ImportScreen.jsx
    WordsScreen.jsx
    StatsScreen.jsx
  components/
    EditModal.jsx
  App.jsx           # Root: auth gate, nav, screen routing
  main.jsx
  index.css         # All styles (CSS variables + utility classes)
```

---

## Adding users

Users must be created manually — the app is invite-only.

1. Go to Supabase → **Authentication → Users → Invite user**
2. Enter their email and send the invite
3. They click the invite link, then use the app's magic link sign-in
   for all future logins

---

## Data model

| Table      | Purpose |
|------------|---------|
| `profiles` | One row per user, auto-created on first sign-in |
| `cards`    | Each user's word list (`sv`, `en`, `note`) |
| `progress` | Per-user, per-card SRS state (`correct`, `wrong`, `interval`, `next_due`) |

Each user's data is fully isolated via Supabase Row Level Security.
No user can read or modify another user's cards or progress.
