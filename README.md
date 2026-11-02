# Study With Students

Peer tutoring with **0% commission**. Students find university students who aced
their subject, book 1-to-1 sessions and pay their tutor directly — the platform
never takes a cut.

The platform earns from one thing: the **Explorer plan (£5/month)**, which unlocks
the community features — the forum, shared study notes and materials, drop-in
study rooms and live group classes. Verified tutors get these for free.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite 5, TanStack Router, Tailwind (base only) + plain CSS tokens, Axios |
| Backend  | Flask 3 (blueprints), flask-jwt-extended, mysql-connector |
| Database | MySQL 8 (`users_tutoring`) |
| Payments | Stripe — embedded subscription checkout + per-session checkout |

## Run it locally

You need Python 3.12, Node 18+ and MySQL 8.

```bash
# 1. Backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env              # then set DB_PASSWORD etc.
.venv/bin/python -m db.seed       # creates tables + demo accounts (idempotent)
.venv/bin/python -m flask --app api/index.py run --debug --port 5001

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                       # http://localhost:5173 (proxies /api → :5001)
```

Demo logins are listed at the top of [`db/seed.py`](db/seed.py).

Without SMTP settings, sign-up verification codes are printed in the API terminal
and auto-filled in debug mode. Without Stripe keys, the Explorer plan has a
"demo activation" button so every feature can be tried locally.

## Deploying (Vercel — studywithstudents.co.uk)

`vercel.json` builds `frontend/` into static files and serves `/api/*` from the Flask
app in `api/index.py` (Python serverless function). In the Vercel project:

1. **Root directory**: the repo root. Framework preset: *Other* (vercel.json sets the build).
2. **Database**: Vercel has no MySQL — create a hosted MySQL 8 database (e.g. Aiven,
   Railway, TiDB Cloud or AWS RDS), then load `db/schema.sql` (the API also creates
   missing tables on startup).
3. **Environment variables** (Production): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
   `DB_PASSWORD`, optional `DB_SSL_CA`; `SECRET_KEY`, `JWT_SECRET_KEY` (long random
   strings); `FRONTEND_URL=https://www.studywithstudents.co.uk`; `SUPER_ADMIN_EMAIL`,
   `ADMIN_SECRET`; `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`;
   `STRIPE_SECRET_KEY` (+ optional `STRIPE_PRICE_ID`); and for the frontend build
   `VITE_STRIPE_PUBLISHABLE_KEY`.
4. Push to the production branch. Check `https://www.studywithstudents.co.uk/api/health`
   — it returns `{"ok": true, "database": true}` once the database is reachable.

Uploaded files (avatars, study notes, tutor proofs) go to `/tmp` on Vercel and do not
persist between requests; move them to object storage (e.g. Vercel Blob or S3) before
relying on uploads in production.

## Project layout

```
api/index.py           WSGI entrypoint (local dev + the Vercel /api function)
vercel.json            Vercel: builds frontend/ as static, routes /api/* to Flask
server/
  __init__.py          app factory: blueprints, JSON, errors, schema bootstrap
  config.py            all settings, read from the environment / .env
  db.py                MySQL connection helpers
  permissions.py       admin check + @explorer_required (the £5 gate)
  schema.py            creates missing tables/columns on startup — never drops
  services/email.py    verification emails (prints codes in development)
  routes/              one blueprint per domain:
    auth  tutors  events  payments  membership  messages  forum
    notes  study_rooms  classrooms  users  screening  admin
db/
  schema.sql           canonical schema
  seed.py              demo data
frontend/src/
  api/                 one module per backend domain (axios + JWT)
  components/
    layout/            HubLayout (app shell), Sidebar, CommandPalette, public Navbar/Footer
    features/          BookSessionModal, SpotlightTour, TutorCard, …
    ui/                Icon, Avatar, Card, Stat, StatusPill, EmptyState, …
  context/             Auth, Theme, PageTitle
  hooks/               useUnreadCount
  lib/                 navigation (single nav config), format, access rules
  pages/               one file per route (see router.jsx)
  styles/app.css       app shell + UI primitives
  index.css            design tokens (dark + light) and public-page utilities
legacy/                the original Jinja/Flask app, kept for reference only
```

## How a session works

1. A student finds a tutor and **sends a request**; the tutor accepts it.
2. The student **books** a time (status `pending`); price = tutor's hourly rate × length.
3. The tutor **confirms** (`confirmed`) or declines.
4. The student **pays the tutor** through Stripe Checkout (`paid`). 0% commission.

## Design

The app uses the homepage's look throughout: navy `#1b263b`, coral `#ff725e`,
Noto Sans JP, flat bordered surfaces and small uppercase coral eyebrows. Every
colour comes from CSS variables in `frontend/src/index.css`, so dark and light
mode are one toggle (sidebar user menu, header, or ⌘K). Press `?` in the app for
keyboard shortcuts.
