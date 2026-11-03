# Architecture

Study With Students is a React single-page app talking to a Flask JSON API over
`/api`, backed by MySQL 8. On Vercel the SPA is served as static files and the API
runs as one Python function (`api/index.py`); locally Vite proxies `/api` to Flask.

**Business model.** Tutors keep 100% of their price. Families pay a 5% booking fee on
top of each session (`events.booking_fee`). The community — forum, study notes, study
rooms and classes — is free for everyone who is logged in. (This replaced the £5/month
Explorer plan in November 2026; older docs may still mention it.)

## Repository layout

```
api/index.py            WSGI entry point (Vercel function; `flask --app api/index.py run` locally)
server/                 the API
  __init__.py           create_app(): config, JWT, CORS, blueprints, error handler, /api/health
  config.py             settings from the environment / .env (DB, mail, Stripe, uploads)
  db.py                 get_db(), current_user_id(), column_exists()
  schema.py             startup bootstrap: applies db/schema.sql and COLUMN_MIGRATIONS
  permissions.py        admin checks (check_admin)
  json.py               JSON provider: ISO-8601 datetimes, decimals as numbers
  matching.py           the tutor ↔ student matching model (pure functions)
  routes/               one blueprint per domain, all under /api
  services/email.py     verification emails (printed to the terminal without SMTP)
db/schema.sql           canonical schema (idempotent CREATE TABLE IF NOT EXISTS)
db/seed.py              demo accounts and activity (logins in its docstring)
tests/                  pytest suite for the API (own MySQL database, see Testing)
frontend/
  index.html, vite.config.js, eslint.config.js
  src/
    main.jsx            providers (theme, confirm dialog, router) + global CSS
    router.jsx          route table, lazy page chunks, guards
    api/                one module per API domain; client.js is the shared Axios instance
    context/            AuthContext (session + JWT), ThemeContext, PageTitleContext
    hooks/              useUnreadCount, useNow, useEscape, useAutoFocus
    lib/                framework-free logic, unit-tested with Vitest (*.test.js next to each module)
    components/
      brand/            our own icon set (icons.jsx), illustrations and the logo
      ui/               primitives: Icon, Avatar, Card, Stat, Pill, StatusPill, EmptyState… and confirm.jsx
      layout/           HubLayout (the logged-in shell), Sidebar, CommandPalette, Navbar/Footer (public site)
      features/         larger shared pieces: EventCard, TutorCard, BookSessionModal, ScreeningQueue, SpotlightTour…
    pages/              one component per route (some with a page stylesheet, e.g. Messages.css)
    styles/brand.css    brand illustration styles
    styles/app.css      hub primitives (shell, card, row, btn, pill, dialog, tabs…)
    styles/responsive.css  touch targets and wrapping rows for phones
    index.css           design tokens (dark and light) and the public site's styles
legacy/                 the original Jinja/Flask app; nothing imports it
docs/                   this file and SAFEGUARDING.md
```

## How a request flows

1. A page calls a function from `src/api/<domain>.js`, which uses the Axios instance in
   `api/client.js`. The client adds `Authorization: Bearer <JWT>` from `localStorage`
   (`sws_token`). A 401 clears the session and sends the user to `/login`.
2. Vite (locally) or Vercel's rewrite sends `/api/*` to Flask. Each blueprint in
   `server/routes/` checks the JWT with `@jwt_required()`, opens a connection with
   `get_db()`, runs parameterised SQL and returns `jsonify(...)`.
3. `ApiJSONProvider` turns datetimes into naive ISO strings (`2026-11-04T18:00:00`, read as
   local time by the browser) and decimals into numbers.
4. Reads that several pages share go through the small cache in `lib/query.js`
   (`useQuery(key, fetcher)`): cached data renders at once while a refetch runs,
   identical requests in flight are shared, and `invalidate(prefix)` refreshes what's on
   screen. Keys and fetchers live in `lib/queries.js`; hovering a nav link prefetches them.

**Identity.** The JWT's identity is the user id; extra claims (`is_tutor`,
`screening_status`, `is_admin`) are a snapshot. The API always re-reads permissions from
the database, and `AuthContext.refreshSession()` re-issues the token with fresh claims —
call it after anything that changes a role (e.g. tutor approval).

**IDs.** `events.tutor_id` is `tutor_profiles.id_tutor` and `events.student_id` is
`student_profiles.id_student` — not user ids. Join through the profile tables to reach
`users`.

## Frontend

**Routing.** `router.jsx` lists every route once. Pages are loaded with
`lazyRouteComponent`, so each page is its own chunk and the first load only carries React,
the router, Axios and the providers (~98 kB gzipped; the hub shell is a chunk of its own). `defaultPreload: 'intent'` starts loading
a page's chunk when a link to it is hovered or focused. Guards run in `beforeLoad` and read
the stored user: `requireAuth`, `requireVerifiedTutor`, `requireAdmin` (redirect with
`throw redirect({ to })`). The API enforces the same rules; guards only keep people off
pages that would fail.

**The hub.** Logged-in pages render inside `<HubLayout>` (sidebar, header, ⌘K palette,
`g`+key shortcuts) and name themselves with `<PageTitle title icon />`. Navigation items
come from `lib/navigation.js`. Tutors switch between a student and a tutor view; the
choice is stored in `localStorage.sws_hub_mode`.

**Shared logic** lives in `src/lib` and is plain JavaScript:

| Module | What |
|---|---|
| `format.js` | money, dates and times (en-GB), `timeAgo`, `plural`, `fullDate`, `initials` |
| `dates.js` | `startOfDay`, `sameDay`, `byStart`, `toDateInput`, `toLocalISO` (what the API expects) |
| `sessions.js` | session rules: `canJoin`, `canReview`, `needsPayment`, `bookingFee`, `totalPrice`, `isStudyRoomCopy` |
| `meetings.js` | study rooms and classes: safe links (`meetingUrl`, `normaliseLink`) and timing (`livePhase`, `minutesUntil`) |
| `xp.js` | graduation levels: `xpFor`, `levelFor`, tiers and thresholds (dashboards and the XP page) |
| `query.js` / `queries.js` | the read cache and its keys |
| `navigation.js` | sidebar / palette / shortcut items |
| `errors.js`, `keyboard.js`, `forum.js` | `notifyError`, the ⌘/Ctrl+Enter shortcut, `authorOf` |

**UI conventions** (the design system: Linear-like structure in the brand's navy, coral
and slate, Noto Sans JP):

- Icons: `<Icon name="…" />` from `components/ui` draws our own SVG set
  (`components/brand/icons.jsx`, sized by font-size). Unknown names render a dot and warn in
  development; for names that come from the database use a fallback, as `CategoryIcon` does.
- Colours only through the tokens in `index.css` (`--text`, `--text-muted`, `--surface`,
  `--border`, `--coral`…). Neutral tints are `rgb(var(--fg) / 0.06)`, never
  `rgba(255,255,255,…)`, so light mode keeps working. Check both themes.
- Build pages from the primitives in `components/ui` and the classes in `styles/app.css`:
  `.card`, `.row-list` / `.row`, `.btn` (`-coral`, `-ghost`, `-quiet`, `-danger`, `-sm`),
  `.tabs`, `.field` + `.input`, `.stat-grid`, `.dialog`. Empty lists use `<EmptyState>`.
- Rows with buttons get `className="row row-wrap"` and put the buttons in
  `<div className="row-actions">`, so on a phone they move under the text.
- Confirmations use `useConfirm()` (`components/ui/confirm.jsx`), never `window.confirm`.
  Feedback uses `react-hot-toast`; `notifyError(err, fallback)` shows the API's message.
- Dialogs: `.overlay.center` + `.dialog`, close on Escape (`useEscape`) and outside click,
  focus their first field with `useAutoFocus()` (the `autoFocus` attribute scrolls the page
  behind them).
- No emoji, no helper text under every field, no callout boxes.
- Every control is at least 32px tall on phones (`styles/responsive.css`); pages must not
  scroll sideways at 320px.

## Backend

- `create_app()` registers the blueprints listed in `server/routes/__init__.py`, turns every
  `HTTPException` into `{"error": …}` JSON and hides other exceptions behind a generic 500.
- `ensure_schema()` runs on startup: it applies `db/schema.sql` and adds any column in
  `COLUMN_MIGRATIONS` that an existing database lacks. It never drops or rewrites data.
- SQL is always parameterised (`%s`). Dynamic column lists are built only from fixed
  whitelists in the code.
- **Session lifecycle:** a student requests a tutor → the tutor accepts (`active_tutors` +
  `active_students`) → the student books (`pending`; `amount` = hourly rate × hours, plus a
  5% `booking_fee`) → the tutor confirms (`confirmed`, a video link is created) → the student
  pays through Stripe Checkout and only a verified checkout marks it `paid`. Either side can
  cancel; only the tutor confirms. A tutor can also schedule one of their students directly
  (created `confirmed`).
- Study rooms saved to a student's calendar are stored as free `events` with kind `room`, titled
  "Study Room: …" (`is_room_copy` / `isStudyRoomCopy`): they never count as sessions, earnings
  or reviews, and never ask to be paid.
- Matching (`server/matching.py`) scores each tutor 0–100 against the student's learning
  profile (subjects 45, level 15, budget 15, availability 10, quality 18) and returns up to
  three reasons; `/api/tutors/recommended` and `/api/tutors` use it.

## Recipes

**Add a page**

1. Create `frontend/src/pages/MyPage.jsx` exporting a default component that renders
   `<HubLayout>`, a `<PageTitle>` and a `.dash-head` with the `<h1>`.
2. Add it to `router.jsx`: `const MyPage = lazy(() => import('./pages/MyPage'))` and
   `page('/my-page', MyPage, requireAuth)`.
3. If it belongs in the sidebar, add an item (with an unused `key`) to `lib/navigation.js`;
   the palette and shortcuts pick it up.
4. Put API calls in `src/api/<domain>.js`, reusable logic in `src/lib` with a test next to it.
5. Check it at 320px and in both themes.

**Add an endpoint**

1. Add a route to the blueprint for its domain in `server/routes/` (or a new blueprint,
   registered in `routes/__init__.py`): `@bp.route('/things', methods=['POST'])` +
   `@jwt_required()`.
2. Read input with `request.get_json(silent=True) or {}`, validate it and return 400 with
   `{"error": "…"}` for bad input, 403 for "not yours", 404 for "missing".
3. Open `conn = get_db(); cur = conn.cursor(dictionary=True)` and close both in `finally`.
4. New columns go in `db/schema.sql` *and* `COLUMN_MIGRATIONS` in `server/schema.py`.
5. Add tests in `tests/` using the `api`, `db` and `make` fixtures.

## Testing and linting

| What | Command (from the repo root unless noted) |
|---|---|
| API tests | `.venv/bin/python -m pytest` (install with `.venv/bin/pip install -r requirements-dev.txt`) |
| Python lint | `.venv/bin/ruff check .` |
| Frontend unit tests | `cd frontend && npm test` (Vitest; `npm run test:watch` while working) |
| Frontend lint | `cd frontend && npm run lint` (ESLint 9, react + react-hooks) |
| Production build | `cd frontend && npm run build` |

**API tests** need the local MySQL from `.env` but never touch the development database:
`tests/conftest.py` creates `users_tutoring_test` (any name must end in `_test`), empties it
before each test and drops it afterwards. Mail and Stripe are switched off; Stripe is
replaced by a fake where checkout is tested. Factories in `tests/support.py` create users,
tutors, connections and sessions straight in SQL.

Two kinds of expected failures are marked, both strict (an unexpected pass fails the run):

- `@pytest.mark.xfail(strict=True, reason=…)` pins a known bug (none are open now). Fix the
  bug, then delete the marker.
- `@pytest.mark.free_community` and `@pytest.mark.booking_fee` describe the new pricing
  contract. `conftest.py` checks whether the server implements it yet and only then runs
  them normally; until then they count as expected failures.

**Frontend tests** are Vitest unit tests for `src/lib` (`*.test.js` next to each module).
They run in Node; `query.test.js` uses jsdom and Testing Library to exercise `useQuery`.
