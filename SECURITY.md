# Security

How the API protects accounts, payments and uploads, and what the owner still has to do
outside the code before (and after) going live.

**Reporting a vulnerability:** please don't open a public issue — use GitHub's private
*Report a vulnerability* button on the repository's Security tab.

## What's protected

### Accounts and sessions
- Passwords are hashed with werkzeug (scrypt). Accounts from before hashing still hold
  plaintext and are upgraded on their next successful login.
- Login gives the same answer, in about the same time, for an unknown email and a wrong
  password, so it can't be used to discover who has an account.
- Email verification codes are 6 random digits (`secrets`), expire after 10 minutes, are
  compared in constant time and stop working after **5 wrong guesses** — the user has to
  request a new code (`server/services/verification.py`). The same rules cover the tutor
  university-email codes. Changing a tutor's university email clears its verified flag.
- JWTs last 7 days. Missing, invalid (including tokens signed with a rotated
  `JWT_SECRET_KEY`) and expired tokens all answer 401, which signs the user out of the app.

### Rate limits (`server/ratelimit.py`)
Over a limit the API answers **429** `{error}` with a `Retry-After` header, and the app shows
one toast.

| Endpoint | Limit |
|---|---|
| `POST /api/auth/login` | 10 per 10 min per email · 60 per 10 min per IP |
| `POST /api/auth/send-verification` | 3 per 10 min per email · 30 per hour per IP |
| `POST /api/auth/register` | 30 per hour per IP (and each code dies after 5 wrong guesses) |
| `POST /api/tutor-screening/send-uni-code` | 3 per 10 min per user · 3 per 10 min per email |
| `POST /api/tutor-screening/verify-uni-email` | 10 per 10 min per user |
| `POST /api/messages` | 30 per minute · 200 per hour per user |
| `POST /api/forum/categories/<id>/threads` | 5 per 10 min per user |
| `POST /api/forum/threads/<id>/posts` | 20 per 10 min per user |

The counters are **in memory, per serverless instance**, and reset on a cold start: they
stop brute force and spam from one client but are not a global cap. On Vercel the client IP
comes from `X-Forwarded-For` (Vercel overwrites it); elsewhere the header is ignored so it
can't be spoofed.

### Production start-up checks
When `VERCEL_ENV=production` (or `FLASK_ENV=production`) the API **refuses to start** if
`SECRET_KEY` or `JWT_SECRET_KEY` is missing, a placeholder or shorter than 32 characters,
`ADMIN_SECRET` is set but shorter than 32 characters, debug mode is on, or `FRONTEND_URL`
isn't `https://`. It logs a warning if `STRIPE_WEBHOOK_SECRET` is missing.

Developer shortcuts — verification codes returned in API responses (`dev_code`) and
`POST /api/membership/demo-activate` — only work in a local debug run: never on any Vercel
deployment (production or preview), whatever `FLASK_DEBUG` says.

### Who can do what
- **Admin endpoints** need the `X-Admin-Secret` header (compared in constant time) or a JWT
  for `SUPER_ADMIN_EMAIL`. Tutor proof documents are admin-only and sent with
  `Cache-Control: private, no-store`.
- **Sessions and payments:** only the two participants see a session; only the tutor
  confirms; only the student pays, and a session is marked `paid` only from a verified
  Stripe Checkout (the return URL check or the webhook).
- **Explorer features** (forum, study notes, study rooms, classes) need the plan or a
  verified tutor. Only verified tutors create study rooms and classes. A class's meeting link
  is shown only to its host and enrolled students (seats are limited); the roster, with
  emails, only to the host. Private study notes are visible to their author only.
- Users can delete only their own threads, replies and notes, and only read their own
  conversations.

### Uploads (`server/services/uploads.py`)
Study notes and tutor proofs are checked for an allowed extension, a size cap (10 MB — Vercel
itself caps request bodies at 4.5 MB) and **content that matches the extension** (file
signature; `.docx`/`.pptx` must be real Office files; `.txt`/`.md` must be UTF-8 text). The
client's filename and Content-Type are never trusted: files are stored under random names and
served with a type derived from the validated extension, notes as downloads, all with
`X-Content-Type-Options: nosniff`.

### Data and errors
- All SQL is parameterised; the few dynamic column lists come from constants, never the request.
- Sign-up, messages, forum posts, notes, classes, study rooms and bio fields are
  length-checked against their columns, so oversized input gets a 400 rather than a 500.
- Unexpected errors return a generic 500; Stripe errors are logged, never echoed to the client.

### Headers
- **API** (`server/__init__.py`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a Permissions-Policy that turns off
  camera, microphone, geolocation, motion sensors, payment and USB, and on JSON responses
  `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` and
  `Cache-Control: no-store`.
- **Frontend** (`vercel.json`): the same headers, plus an enforced CSP
  (`frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`) and a
  full policy in **report-only** mode (`Content-Security-Policy-Report-Only`) that allows
  only the app itself, Google Fonts, Stripe.js/Checkout and the LordIcon script.

  The full policy was checked against a production build — home, login, hub, messages,
  calendar, tutors, payments and membership, with Stripe.js loaded — and reported no
  violations. The Stripe Checkout iframe itself needs real test keys to render, so check it
  once on a preview deployment (open the browser console on `/membership` and start a
  checkout: there should be no `[Report Only]` CSP messages), then rename the header to
  `Content-Security-Policy` in `vercel.json` (merging in the four enforced directives).

### Stripe
- `POST /api/membership/webhook` accepts only deliveries signed with `STRIPE_WEBHOOK_SECRET`
  and less than 5 minutes old.
- Handlers are idempotent and safe out of order: access only moves forward to a paid
  period's end (+1 day grace), an ended subscription stays ended, and a subscription only
  affects the user it's on file for. Checkout sessions and subscriptions carry the user id in
  their metadata.
- The return-from-checkout check reads the subscription's live state from Stripe, so an old
  or unrelated checkout session can't unlock or extend Explorer.

## Operational to-dos for the owner

1. **Rotate the MySQL password** that is in this public repository's git history, on the
   database server and **everywhere else it was reused** (other databases, hosting panels,
   email, …). Removing it from the files doesn't remove it from history or from anyone's
   clone, so rotation is what matters. While you're there, give the app's database user only
   the privileges it needs on `users_tutoring`.
2. **Set the secrets in Vercel per environment** (Project → Settings → Environment
   Variables), with different values for *Production* and *Preview*:
   `SECRET_KEY`, `JWT_SECRET_KEY` and `ADMIN_SECRET` (generate each with
   `python3 -c "import secrets; print(secrets.token_hex(32))"`), `DB_*`, `MAIL_*`,
   `FRONTEND_URL`, `SUPER_ADMIN_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
   `STRIPE_WEBHOOK_SECRET` and `VITE_STRIPE_PUBLISHABLE_KEY`. Preview deployments should
   use Stripe **test** keys and a separate database. Never put these in the repository.
3. **Register the Stripe webhook** (Stripe Dashboard → Developers → Webhooks → Add endpoint):
   URL `https://www.studywithstudents.co.uk/api/membership/webhook`, events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`,
   `customer.subscription.updated` and `customer.subscription.deleted`. Copy its signing
   secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` for Production; create a second endpoint
   in test mode for Preview. Without it, Explorer renewals are never recorded and members
   lose access after their first month.
4. **Stripe Connect for tutor payouts is not built yet.** Session payments currently land in
   the platform's own Stripe account, and tutors would have to be paid out by hand. Paying
   tutors directly with 0% commission needs Stripe Connect (connected accounts for tutors,
   with onboarding/KYC, and destination charges or transfers), plus the matching terms and
   accounting. Until then, don't take live session payments at scale.
5. **Turn the frontend CSP on** after the preview check described under *Headers*.
6. **Remove the LordIcon script** from `frontend/index.html`: nothing uses `<lord-icon>`, and
   it's third-party code running with full access to every page.
7. **Move uploads to object storage.** On Vercel they go to `/tmp` and disappear; keep tutor
   proofs in a private bucket served through the admin-only endpoint.
8. **Fix the admin proof links:** the admin pages open `/api/uploads/tutor-proofs/…` with a
   plain link/`<img>`, which can't send the JWT, so they get 403. Fetch the file through the
   API client and show it from a blob URL.
9. Consider shared rate limits (e.g. Upstash Redis or Vercel WAF rules on `/api/auth/*`) and
   shorter-lived JWTs with refresh tokens; tokens currently live 7 days in `localStorage`.
10. Turn on GitHub's private vulnerability reporting (Settings → Code security) so the link
    at the top of this file works.
