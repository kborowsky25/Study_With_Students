# QA findings

Found during the November 2026 quality pass (branch `claude/quality-pass-fda2df`) in files owned
by other workstreams, so they were not edited there. Line numbers refer to the branch after it
merged `claude/finish-platform` (`3162761`). Items marked **[xfail]** are pinned by a strict
`xfail` test in `tests/`: fix the bug, then delete the marker (the run fails until you do).

Fixed on the quality-pass branch itself (for reference): the pages it owns were checked at
320–1920px in both themes, and their bugs are described in its commit messages.

## Highest priority

1. **The booking fee is never charged** — `server/routes/payments.py:52` builds the Stripe
   checkout from `amount` only, while the Payments page shows (and the family expects to pay)
   `amount + booking_fee`. *Fix:* charge `amount + booking_fee` (two line items reads best:
   "Session with Oliver" and "Booking fee"); `tests/test_payments.py:77` then needs the fee in
   its expected `unit_amount`.
2. **The community is still gated in the API** — 20 routes in `server/routes/forum.py`,
   `notes.py`, `study_rooms.py` and `classrooms.py` still use `@explorer_required`
   (`server/permissions.py`), so on this branch a free student opening the forum gets 402s
   although the frontend now treats the community as free. The `free_community` tests switch on
   by themselves once the decorator is gone.
3. **Uploads don't survive on Vercel** — `server/config.py:56` puts uploads in `/tmp/uploads` on
   Vercel, which is per-invocation and wiped. Study-note files, tutor avatars and proof documents
   uploaded in production will 404 later. Vercel also rejects request bodies over 4.5 MB before
   Flask sees them, while `MAX_CONTENT_LENGTH` (`config.py:19`) and the UI allow 25 MB for notes
   and 10 MB for proofs, so larger uploads fail with a generic error.
   *Fix:* store files in object storage (Vercel Blob, S3, R2) with direct-to-storage uploads;
   until then cap uploads at 4 MB in the API and the UI.
4. **Legacy study-room copies cost £20** — `users_tutoring.events` has 8 calendar copies of study
   rooms (title `Study Room: …`, March 2026) stored at `amount = 20.00`, from before rooms were
   saved as free events. Students see "£20 to pay" for a free room and tutors see £20 unpaid.
   *Fix (one-off, check the rows first):*
   `UPDATE events SET amount = 0 WHERE title LIKE 'Study Room: %' AND status = 'confirmed' AND amount = 20.00;`
5. **Study-room calendar copies are treated as 1-to-1 sessions** **[xfail]** —
   `server/routes/study_rooms.py:101–132` saves a room as an ordinary `events` row
   (`confirmed`, `amount = 0`, `tutor_id` = host). Per student who saves it, the host gets a £0
   "unpaid" session in `/api/payments?role=tutor` and a 1-to-1 entry in `/api/events`; after it
   ends it counts toward `sessions_done` (`server/routes/tutors.py:66–67`, which feeds tutor cards
   and the matching model), the student can review it (`server/routes/reviews.py:43`) and it adds
   to the student's profile stats (`server/routes/users.py:64`). The frontend now filters these
   out with `isStudyRoomCopy()`, but the API should not report them.
   *Fix:* mark copies (`events.study_room_id INT NULL` via `COLUMN_MIGRATIONS`, or a separate
   `study_room_saves` table) and exclude them from payments, `sessions_done`, reviews, profile
   stats and the host's schedule.
6. **A tutor can revive a cancelled session** **[xfail]** — `server/routes/events.py:156–185`
   only locks `paid`; `confirmed` on a `canceled` session brings it back (with a new meeting link)
   without the student. *Fix:* allow only pending → confirmed and pending/confirmed → canceled.
7. **Reviews before the session happened** **[xfail]** — `server/routes/reviews.py:43` accepts a
   review for any `paid` session, and students pay in advance. *Fix:* require
   `ev['end_time'] < now` for paid sessions too. (The frontend's `canReview` is fixed.)
8. **Changing the university email keeps it "verified"** — `server/routes/screening.py:42`
   updates `uni_email` when a new code is requested but leaves `uni_email_verified = 1`, so a tutor
   can verify one address, then switch to another that admins see as verified.
   *Fix:* `SET uni_email = %s, uni_email_verified = 0` when the address changes.

## Backend (`server/`)

9. **Legacy admin endpoints 500** **[xfail]** — `server/routes/admin.py:23, 38, 52`
   (`/api/admin/tutors`, `/api/admin/tutors/<id>/approve|reject`) use `tutor_profiles.status`, a
   column that doesn't exist. Nothing in the frontend calls them. *Fix:* delete them (the
   `/api/admin/screening*` endpoints replace them).
10. **Tutor requests aren't checked** **[xfail]** — `server/routes/tutors.py:334` stores a request
   to a tutor id that doesn't exist, and lets a tutor request (and accept) their own profile.
   *Fix:* look up `id_user` for the tutor first; 404 if missing, 400 if it's the caller.
11. **Non-numeric `receiver_id` → 500** **[xfail]** — `server/routes/messages.py:94`
   `int(receiver_id)` raises. *Fix:* catch `TypeError/ValueError` → 400.
12. **Unchecked request bodies** — `server/routes/tutors.py:438` and `server/routes/users.py:79`
    call `request.get_json()` without `silent=True` (non-JSON → 415; in users.py a JSON array
    crashes on `.items()` → 500), and users.py stores bio/school/year with no length limits
    (the DB columns are 50–200 characters, so long values fail in strict mode).
    `server/routes/learning.py:50, 68, 70` crash on non-string values (`.strip()` on an int).
    *Fix:* `request.get_json(silent=True) or {}`, check it's a dict, coerce with `str()`, trim to
    the column sizes.
13. **Unverified tutors can teach** — `respond_tutor_request` (`tutors.py:433`) and `create_event`
    (`events.py:84`) ignore `screening_status`, and `/api/tutors` + `/api/tutors/recommended` hide
    only rejected tutors, so a pending tutor can be found, accept students and be booked.
    (The DBS check work may cover this.)
14. **Saving a room without a student profile** — `server/routes/study_rooms.py:121` uses
    `student_id = None` when the user has no student profile, which `events.student_id NOT NULL`
    rejects (500). Registration always creates one, so this only hits accounts made elsewhere.
15. **Class enrolment** — `server/routes/classrooms.py:165` lets a tutor enrol in their own class
    and lets anyone enrol in a class that has already ended.
16. **Times are naive local time** — `server/json.py:13` serialises datetimes without a zone and
    MySQL's `CURRENT_TIMESTAMP` uses the server's zone; the browser reads them as its own local
    time. With a UTC database in production, UK users in summer see message and post times an
    hour off. *Fix:* store UTC and serialise with `Z` (or an offset).
17. **`datetime.utcnow()` is deprecated** (Python 3.12) — `server/routes/auth.py:76, 127`,
    `server/permissions.py:41`, `server/routes/screening.py:46, 91, 139`,
    `server/routes/membership.py:32`. *Fix:* `datetime.now(UTC).replace(tzinfo=None)`. The warning
    is filtered for `server` in `pyproject.toml`; drop the filter once fixed.
18. **Booking-fee rounding** — `server/routes/events.py:17` computes
    `round(float(amount) * 5 / 100, 2)`: floats plus round-half-to-even, so a £22.50 session gets
    a £1.12 fee where half-up gives £1.13. *Fix:* `Decimal(amount) * Decimal('0.05')` quantised
    with `ROUND_HALF_UP`. Booking tests will need tutors with a verified DBS check once that
    feature lands.

### Ruff (`.venv/bin/ruff check .`)

14 findings remain, all in files owned by other workstreams (`ruff check --fix` handles the
I001s; the rest are one-line edits):

- `db/seed.py:103` E501 · `server/matching.py:116` E741 (`l`) · `server/schema.py:22` E501,
  `:54` E741 (`l`)
- `server/routes/admin.py:3` I001, `:169` E501 · `classrooms.py:2` I001 · `events.py:203` E501
- `server/routes/learning.py:22` B905 (`zip()` without `strict=True`) · `notes.py:2` I001, `:84` E501
- `server/routes/screening.py:2` I001 · `study_rooms.py:2` I001 · `tutors.py:251` E501

## Frontend

19. **Explorer leftovers** — the merge of `claude/finish-platform` cleared the sidebar, palette,
    navigation, API client, prefetching and dashboard tour. Left: `context/AuthContext.jsx:61, 64`
    still exposes `isPremium`, and the API side (item 2).
20. **Touch targets in the primitives** — `styles/app.css` sizes `.btn` 30px, `.btn-sm` 26px,
    `.icon-btn` 30px, `.mode-switch button` 26px, `.card-link` 26px, `.nav-item` 28px and
    `.choice-grid button` 30px. `styles/responsive.css` (quality pass) lifts the ones on hub pages
    and dialogs to 32px below 900px and on touch screens; fold it into `app.css` during the
    redesign (and cover `.nav-item` / `.choice-grid button`, which it leaves alone).
21. **Toasts ignore light mode** — `main.jsx:25–56` hard-codes `#1a2640` backgrounds and light
    text, so toasts stay dark navy in light mode. *Fix:* `var(--elevated)`, `var(--text)`,
    `var(--border)`, `var(--shadow-pop)`.
22. **Duplicated date helpers** — `components/features/EventCard.jsx:29–31` and
    `components/features/BookSessionModal.jsx:20–22` define `pad` / `localISO` / `dateOnly`;
    `lib/dates.js` now has `toLocalISO` and `toDateInput`.
23. **Dialog focus scrolls the page** — `EventCard.jsx:439` and `BookSessionModal.jsx:86` use
    `autoFocus` inside dialogs that live in the hub's scroll area; on phones the page behind
    jumps. *Fix:* `hooks/useAutoFocus`.
24. **Dead API function** — `api/tutors.js:14` `addActiveStudent` posts to
    `/api/active-students`, which doesn't exist.
25. **Small tap target in tutor cards** — `components/features/TutorCard.jsx:56`: the tutor's
    name link is 20px tall on phones (Saved tutors, Find tutors). Give it the row's height or
    make the whole card the link.
26. **Free-form category icons** — `forum_categories.icon` holds Material Symbols names, and the
    dev data's "Vibes" category uses `mood`, which `components/brand/icons.jsx` doesn't draw (a dot
    and a console warning). The forum pages now fall back to the forum glyph
    (`components/features/CategoryIcon.jsx`); add `mood` to the set if it should have its own.
27. **Duplicated price helper** — `pages/HubStudent.jsx:30` defines `total` = amount + booking
    fee; `lib/sessions.js` has `totalPrice` (and `bookingFee`).
28. **Unrouted page** — `pages/BrandGallery.jsx` isn't in `router.jsx`. If it should be
    reachable (e.g. for design review), add a route for it.
29. **ESLint** — `npm run lint` passes with 14 warnings, none in quality-pass files:
    - dead code in the marketing pages (warnings only through an override in
      `eslint.config.js`; remove it once cleaned up): `pages/AboutUs.jsx:41` `Wave`, `:361`
      `VALUES`, `:394` `FOUNDING_TUTORS`; `pages/BecomeATutor.jsx:190` `ultraDim`;
      `pages/Home.jsx:622` `UnicefBadge`; `pages/HowItWorks.jsx:265` `today`, `:541`
      `STUDENT_XP`, `:548` `TUTOR_XP`, `:581` `TEXT_45`, `:777` `TEXT_FAINT`, `:784` `SURF2`;
    - `react-hooks/exhaustive-deps`: `context/PageTitleContext.jsx:22`, `pages/HowItWorks.jsx:614`,
      `pages/Signup.jsx:18`.
30. **`/admin` has no route guard** — `router.jsx` (kept as it was) lets anyone open `/admin`;
    the page now shows "Only admins can review applications" when the API answers 403, but a
    `requireAdmin` guard would be cleaner.
