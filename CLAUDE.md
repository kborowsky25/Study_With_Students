# Study With Students — CLAUDE.md

Peer tutoring platform with **0% commission**. Revenue comes only from the
**Explorer plan: £5/month**, which unlocks the forum, study notes (materials),
study rooms and live classes. Verified tutors get those free. See README.md for
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
- Community endpoints use `@explorer_required` (server/permissions.py) → 402 `{code: 'explorer_required'}`.
- Passwords are hashed with werkzeug; legacy plaintext rows are upgraded on next login.
- JSON: datetimes serialise as ISO-8601 and decimals as numbers (server/json.py).
- SQL must always be parameterised — never interpolate user input.
- IDs: `events.tutor_id` → `tutor_profiles.id_tutor`, `events.student_id` → `student_profiles.id_student`
  (not user ids). Join through the profile tables to reach `users`.

## Session lifecycle
request tutor → tutor accepts (active_tutors + active_students) → student books (`pending`,
amount = hourly_rate × hours) → tutor confirms (`confirmed`) → student pays via Stripe (`paid`).
Either side can cancel; only the tutor confirms; only verified Stripe checkouts mark `paid`.

## Frontend (frontend/src)
- All API calls go through `api/client.js` (JWT interceptor, 401 → login, 402 → Explorer toast).
- `AuthContext.refreshSession()` re-issues the JWT with live claims — call it after plan/role changes.
- Navigation lives in `lib/navigation.js` (sidebar, ⌘K palette and `g`+key shortcuts all read it).
- Hub pages render inside `<HubLayout>` and set the header with `<PageTitle title icon />`.
- Access rules: `lib/access.js` (`hasExplorerAccess`) mirrors the API.
- Feedback via `react-hot-toast`.

## Design system — keep the homepage's aesthetic
- Navy `#1b263b`, coral `#ff725e`, Noto Sans JP, flat surfaces with 1px borders,
  small uppercase coral eyebrows (`.eyebrow`), heavy tight headings.
- Colours only through tokens in `index.css` (`--text`, `--text-muted`, `--surface`, `--border`,
  `--coral`, …). For neutral tints use `rgb(var(--fg) / 0.06)` — never `rgba(255,255,255,…)`,
  so light mode keeps working.
- Reuse the classes in `styles/app.css` (card, row, btn, pill, stat, dialog, …) and the
  components in `components/ui/`. No `onMouseEnter` style hacks — use CSS `:hover`.
- Public marketing pages (Home, HowItWorks, AboutUs, BecomeATutor) handle the theme
  with `useTheme()` ternaries; keep their structure when editing copy.

## Legacy
`legacy/` holds the original Jinja/Flask app and its templates. Nothing imports it.
