# Study With Students

Peer tutoring where **tutors keep 100%**. Students find verified university students
who aced their subject, book 1-to-1 sessions, and pay the tutor's price plus a small,
visible **5% booking fee** — the platform's only revenue. The community (forum, shared
study notes, study rooms, live classes) is free for everyone. Tutors are background
checked (DBS) before they can be booked, and a simple matching model recommends tutors
from each student's subjects, level, budget and availability.

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
and auto-filled in debug mode.

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
   `STRIPE_SECRET_KEY`; and for the frontend build `VITE_STRIPE_PUBLISHABLE_KEY`.
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
  permissions.py       admin checks
  matching.py          tutor ↔ student matching model (0–100 score + reasons)
  schema.py            creates missing tables/columns on startup — never drops
  services/email.py    verification emails (prints codes in development)
  routes/              one blueprint per domain:
    auth  tutors  learning  events  reviews  payments  messages  forum
    notes  study_rooms  classrooms  users  screening  admin
db/
  schema.sql           canonical schema
  seed.py              demo data
frontend/src/
  api/                 one module per backend domain (axios + JWT)
  components/
    layout/            HubLayout (app shell), Sidebar, CommandPalette, public Navbar/Footer
    brand/             our own logo, icon set and illustrations
    features/          BookSessionModal, ReviewDialog, LearningProfileDialog, EventCard, …
    ui/                Icon, Avatar, Card, StatusPill, Stars, EmptyState, useConfirm, …
  context/             Auth, Theme, PageTitle
  hooks/               useUnreadCount
  lib/                 navigation, query cache, sessions rules, xp levels, format
  pages/               one file per route (see router.jsx)
  styles/app.css       app shell + UI primitives
  index.css            design tokens (dark + light) and public-page utilities
legacy/                the original Jinja/Flask app, kept for reference only
```

## How a session works

1. A student finds a tutor (or picks a recommended one) and **sends a request**; the tutor accepts.
2. The student **books** a time (`pending`); price = tutor's hourly rate × length, plus a 5% booking fee.
3. The tutor **confirms** (`confirmed`) — a private video room link is created — or declines.
4. The student **pays** through Stripe Checkout (`paid`); the tutor keeps 100% of their price.
5. After the session the student can **leave one review**, which feeds the tutor's rating.

## Design

The app has Linear-style structure in our own identity: deep navy, coral, slate,
Noto Sans JP, and our own logo, icons and illustrations (`frontend/src/components/brand`).
Every colour comes from CSS variables in `frontend/src/index.css`, so dark and light
mode are one toggle. Press `?` for shortcuts, `⌘K` to search, `[` to hide the sidebar.
