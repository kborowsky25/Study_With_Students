# To do

Things to do outside the code (accounts, settings) before and after going live.
Everything here can stay £0 while the project is a hobby.

## 1. Set up staging (free)

1. **Database** — sign up for a free MySQL host (e.g. Aiven free plan or TiDB Cloud free tier).
   Create two databases: `sws_prod` and `sws_staging`. Keep the host, port, user and
   password somewhere safe — never paste them into chat or commit them. Tables are
   created automatically the first time the app starts.
2. **Secret keys** — generate four random strings (two per environment):
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```
3. **Vercel → Settings → Environment Variables** — add each variable twice: once for
   *Production*, once for *Preview* limited to the branch `staging`.

   | Variable | Production | Staging (Preview, branch `staging`) |
   |---|---|---|
   | `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` | free host | same host |
   | `DB_NAME` | `sws_prod` | `sws_staging` |
   | `SECRET_KEY`, `JWT_SECRET_KEY` | two strings from step 2 | two different strings |
   | `FRONTEND_URL` | `https://www.studywithstudents.co.uk` | `https://staging.studywithstudents.co.uk` |
   | `VITE_SITE_URL` | `https://www.studywithstudents.co.uk` | `https://staging.studywithstudents.co.uk` |
   | `SUPER_ADMIN_EMAIL` | your email | your email |
   | `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe **test** keys while it's a hobby | Stripe test keys |
   | `STRIPE_WEBHOOK_SECRET` | signing secret of the webhook below | the test-mode webhook's secret |
   | `CRON_SECRET` | random string (reminder emails) | a different random string |

4. **Vercel → Settings → Domains** — add `staging.studywithstudents.co.uk`, assign it to
   the Git branch `staging`, then add the CNAME record Vercel shows (name `staging`) in
   the domain's DNS settings.
5. **Push a `staging` branch** to GitHub — Vercel builds the staging site from it.
   (Claude can do this on request; it doesn't affect the live site.)
6. **Check** `https://staging.studywithstudents.co.uk/api/health` returns
   `{"ok": true, "database": true}`. Load demo accounts into staging by running
   `db/seed.py` once with the staging database settings.

Notes:
- Workflow: feature branches → merge into `staging` to test → merge `staging` into `main` to go live.
- Vercel keeps preview/staging sites behind your Vercel login by default (good for staging).
  To let friends test, turn it off in *Settings → Deployment Protection*.
- If the database host requires a CA certificate for TLS, the app needs a small change to load it (`DB_SSL_CA`).

## 2. Fix the live site

- The live site (studywithstudents.co.uk) is down: production still runs the old Jinja
  `app.py`, which crashes on start (missing `flask_socketio`) and has no database.
- Once the Production variables above exist: merge the new code into `main` and push.
  Then check `https://www.studywithstudents.co.uk/api/health`.

## 3. Security

- [ ] Change the old MySQL root password — it is in the public GitHub history — and any
      account that reuses it or something similar.
- [ ] Optional: rewrite the git history to remove it (e.g. `git filter-repo`); needs a force-push.
- [ ] Set `ADMIN_SECRET` in Vercel if you want header-based admin access (32+ characters —
      production refuses to start with a shorter one, or with missing/weak `SECRET_KEY`s).

## 4. Payments (when going commercial)

Model: tutors keep 100% of their price; families pay a 5% booking fee, which also covers
Stripe's card fees.

- [ ] Register the Stripe webhook for session payments (Stripe Dashboard → Developers →
      Webhooks): URL `https://www.studywithstudents.co.uk/api/payments/webhook`, events
      `checkout.session.completed` and `checkout.session.async_payment_succeeded`; put its
      signing secret in `STRIPE_WEBHOOK_SECRET` in Vercel. Do the same in test mode for
      staging. Details in SECURITY.md.
- [ ] Build Stripe Connect payouts so session payments reach tutors (not built yet).
- [ ] Switch to Stripe live keys and Vercel Pro (Hobby is for non-commercial use only).

## 5. Before real users

- [ ] Uploaded files (avatars, study notes, tutor proofs) don't persist on Vercel — move them
      to object storage (e.g. Vercel Blob or S3).
- [ ] Set up a free transactional email service for sign-up codes and reminders (`MAIL_*` variables).
- [ ] Review `docs/SAFEGUARDING.md` (draft, not legal advice) and decide how tutors without an
      enhanced DBS check can get one (umbrella body).
- [ ] Decide: should Find tutors hide tutors who aren't approved yet? Students can request them,
      but messaging only reaches approved tutors.
- [ ] Decide: under-13 sign-ups (13 is the UK GDPR consent age). Ages are self-declared.
- [ ] A parent and child could both pay the same session at the same moment: reuse one open
      Stripe Checkout per session.
- [ ] Account suspension for people who get reported (reports cover messages only so far).
- [ ] Run one real Stripe test-mode checkout: fee line, waived-fee description, a parent paying.

## 6. Search (public tutor and subject pages)

- [ ] Once live, add the site to Google Search Console (free) and submit
      `https://www.studywithstudents.co.uk/sitemap.xml`. `frontend/public/robots.txt` names that
      address; change it if the domain differs.
- [ ] Keep staging behind Vercel's login (the default), or search engines will index it too.
- [ ] Optional: link previews (WhatsApp, LinkedIn) only see the generic tags in `index.html`. A small
      Flask route that fills in each tutor page's tags would fix that (no paid service needed).
- [ ] Optional: "Sign up to book" on a tutor page could bring families back to that tutor after
      sign-up (a `?redirect=` on login and sign-up).

## 7. Housekeeping

- [ ] Old "Study Room:" sessions created by a fixed bug are still in the local dev database.
      Clean them up with:
      ```sql
      DELETE e FROM events e JOIN events k ON k.title = e.title AND k.student_id = e.student_id
        AND k.tutor_id = e.tutor_id AND k.start_time = e.start_time AND k.id_event < e.id_event
        WHERE e.title LIKE 'Study Room:%';
      UPDATE events SET amount = 0 WHERE title LIKE 'Study Room:%';
      ```
- [ ] Decide what to do with old uncommitted files (moved to `legacy/unused-frontend/`): `calendar.js`,
      `MonthCalendar.jsx`, and the other untracked files in `legacy/`.
- [ ] Earlier unsaved edits to `Home.jsx`/`CalendarTutor.jsx` from `main` are in `git stash`
      ("local main WIP") — review or drop.
