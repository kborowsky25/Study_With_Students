# Study With Students — CLAUDE.md

Peer tutoring platform. **Tutors keep 100%** of their hourly rate; families pay a
visible **5% booking fee** per session — the platform's only revenue. The community
(forum, study notes, study rooms, live classes) is **free** for every member. Tutors
are verified university students with background (DBS) checks. See README.md for
setup and the project layout.

## Running locally
- API: `.venv/bin/python -m flask --app api/index.py run --debug --port 5001` (port 5000 is taken by macOS AirPlay)
- Web: `cd frontend && npm run dev` → http://localhost:5173, proxies `/api` → :5001
- Both are configured in `.claude/launch.json` as `api` and `web`.
- Demo data: `.venv/bin/python -m db.seed` (logins in the docstring of db/seed.py)
- Settings come from `.env` (copy `.env.example`). Never hard-code secrets.

## Backend (server/)
- App factory in `server/__init__.py`; one blueprint per domain in `server/routes/`, all under `/api`.
- `server/schema.py` runs on startup: applies `db/schema.sql` (CREATE IF NOT EXISTS) and adds
  missing columns from `COLUMN_MIGRATIONS`. It must never drop or rewrite data — add new columns there.
- Booking fee: `events.booking_fee` = `BOOKING_FEE_PERCENT` (5%) of `events.amount`, stored when a
  session is booked; the tutor earns `amount`, the family pays `amount + booking_fee`.
- Matching: `server/matching.py` scores tutors 0–100 against the student's learning profile
  (`/api/learning-profile`, `/api/tutors/recommended`); reasons are shown to the student.
- Passwords are hashed with werkzeug; legacy plaintext rows are upgraded on next login.
- JSON: datetimes serialise as ISO-8601 and decimals as numbers (server/json.py).
- SQL must always be parameterised — never interpolate user input.
- IDs: `events.tutor_id` → `tutor_profiles.id_tutor`, `events.student_id` → `student_profiles.id_student`
  (not user ids). Join through the profile tables to reach `users`.

## Session lifecycle
request tutor → tutor accepts (active_tutors + active_students) → student books (`pending`,
amount = hourly_rate × hours, booking_fee = 5%) → tutor confirms (`confirmed`, a video room link
is generated) → student pays via Stripe (`paid`) → student can review once.
Either side can cancel; only the tutor confirms; only verified Stripe checkouts mark `paid`.

## Frontend (frontend/src)
- All API calls go through `api/client.js` (JWT interceptor, 401 → login), with `errorMessage()` for toasts.
- `AuthContext.refreshSession()` re-issues the JWT with live claims — call it after plan/role changes.
- Navigation lives in `lib/navigation.js` (sidebar, ⌘K palette and `g`+key shortcuts all read it).
- Hub pages render inside `<HubLayout>` and set the header with `<PageTitle title icon />`.
- Data: `lib/query.js` (stale-while-revalidate cache, `useQuery`, `invalidate`) with keys in
  `lib/queries.js`; session rules (join/review/payment) in `lib/sessions.js`; levels in `lib/xp.js`.
- Confirmations are dialogs: `useConfirm()` from `components/ui/confirm.jsx` — never inline text.
- Feedback via `react-hot-toast`.

## Design system — Linear structure, our identity
- Linear-like structure: dense lists with hairline dividers, small radii (6–12px), calm type
  (13.5px base, weights 500–600), group headers, status glyphs (not coloured pills).
- Our twist: deep navy, coral accents, slate secondary text, Noto Sans JP, our own rocket logo,
  icons and illustrations (`components/brand/` — never use downloaded/stock art or icon fonts).
- Colours only through tokens in `index.css`; neutral tints via `rgb(var(--fg) / 0.06)`.
- Reuse the classes in `styles/app.css` and components in `components/ui/` (Icon, StatusPill,
  Stars, Card, …). No helper text under everything, no callout boxes, no emoji, no gradients.
- Public marketing pages use the original homepage look (heavy uppercase hero, illustrations).

## Legacy
`legacy/` holds the original Jinja/Flask app and its templates. Nothing imports it.
