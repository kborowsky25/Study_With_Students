# Scheduling

How sessions get booked, moved, cancelled and reminded. Rules live in `server/scheduling.py`
(server) and `frontend/src/lib/sessions.js` (the same rules for the UI).

## What people can do

**Tutors** set weekly hours (e.g. Tue 17:00–20:00), days off and a minimum notice
(2 hours to 2 days, 12 hours by default) on the Availability page. Saving rewrites the profile's
availability text from the hours ("Weekday evenings, Sunday afternoons"), so the directory and the
matching model read the same thing (`availability_summary()` in `server/scheduling.py`).

**Students** book a connected tutor by picking one of the tutor's open start times: inside the
weekly hours, outside days off and the notice, every half hour, and not overlapping any pending,
confirmed or paid session of either of them. A tutor without weekly hours gets a free date and
time instead. Bookings can repeat every week for up to 12 weeks; the weeks form a series
(`events.series_id`, the first week's id). If some weeks clash, the student sees which and can
book the others.

**Free intro call**: one 15-minute call per tutor before the first paid session with them
(amount 0, booking fee 0, title "Intro call", `events.kind = 'intro'`). Same confirm flow, gets a
video link, never needs paying. A declined or cancelled intro call doesn't use it up.

**Tutors confirm** requests as before. One confirmation (or decline) answers a whole series, and
the series shares one video room.

**Moving a session**: either side proposes a new time (same length); the other accepts or
declines. While a proposal is open, the proposed time is held. A student's own pending request
just moves, since the tutor hasn't agreed to a time yet. Accepting the tutor's new time for a
pending request also confirms it.

**Cancelling**: students cancel free of charge until 24 hours before a session. Inside 24 hours a
confirmed session can only be cancelled with the tutor's agreement: the student asks, the tutor
agrees or keeps the session. Tutors can always cancel; every cancellation records who did it and
when (`canceled_by`, `canceled_at`, `cancel_type`: `declined`, `withdrawn`, `canceled`, or `late`
for inside 24 hours), and `tutor_cancellations()` counts a tutor's for a future reliability
score. A cancelled week of a series can be just that week or that week and the later ones. Paid
sessions can't be cancelled in the app (there are no refunds yet).

**Calendars**: every confirmed session has "Add to Google Calendar" and a `.ics` download, and a
series can be downloaded as one `.ics` with all its weeks. Times are UK time
(`TZID=Europe/London`).

**Reminders**: an email 24 hours and 1 hour before every confirmed or paid session, to both sides,
with the video link. Without SMTP settings they print to the API terminal.

Session times are stored as UK wall-clock times, so the server compares them with UK time
(`local_now()`), not the server's clock (Vercel runs in UTC).

## API

All under `/api`, JWT required unless noted.

| Method | Path | What |
|---|---|---|
| GET | `/availability` | The signed-in tutor's weekly hours, days off, notice and profile summary |
| PUT | `/availability` | Replace weekly hours `[{weekday 0–6 (Mon first), start, end}]` and `notice_hours` |
| POST | `/availability/blocked` | Add days off `{start_date, end_date?, note?}` |
| DELETE | `/availability/blocked/<id>` | Remove days off |
| GET | `/tutors/<id>/booking-info` | Has weekly hours? Intro call still available to me? |
| GET | `/tutors/<id>/slots?minutes=60&weeks=3` | Open start times (`event=<id>` when moving a session, `student=<id>` for a tutor scheduling one of their students) |
| POST | `/events` | Book (`tutor_id`) or schedule (`student_id`); `repeat_weeks`, `kind: 'intro'`, `skip_conflicts` |
| PUT | `/events/<id>/status` | `confirmed` or `canceled`; `scope: 'series'` for this and later weeks |
| POST | `/events/<id>/reschedule` | Propose a new `start_time` |
| POST | `/events/<id>/reschedule/accept` | Accept the other side's new time |
| DELETE | `/events/<id>/reschedule` | Decline it, or withdraw your own |
| POST | `/events/<id>/cancel-request` | Student asks to cancel inside 24 hours |
| DELETE | `/events/<id>/cancel-request` | Student withdraws, or tutor keeps the session |
| POST | `/events/<id>/cancel-request/accept` | Tutor agrees: cancelled at the student's request |
| GET | `/events/<id>/ics` | Calendar file for one session |
| GET | `/series/<series_id>/ics` | Calendar file for the remaining weeks of a series |
| PUT | `/events/<id>/meeting` | Tutor sets their own video link; `scope: 'series'` for later weeks too |
| POST | `/cron/reminders` | Sends due reminders. No JWT: `Authorization: Bearer <CRON_SECRET>` (or `X-Cron-Secret`). `?dry_run=1` lists what's due |

Booking errors carry a `code`: `notice`, `away`, `hours`, `tutor_busy`, `student_busy`,
`conflicts` (with a `conflicts` list for weekly bookings), `intro_used`, `late_cancel`.

## Reminders on the free plan

Vercel Hobby runs cron jobs at most once a day, so `.github/workflows/reminders.yml` calls
`POST /api/cron/reminders` every 15 minutes from GitHub Actions (free on a public repository).
Each email is recorded in `session_reminders` before it's sent, so overlapping or repeated runs
never send twice, and moving a session re-arms its reminders.

Setup, once:

1. Make a secret: `python3 -c "import secrets; print(secrets.token_hex(32))"`
2. Vercel → Settings → Environment Variables: `CRON_SECRET` = that value (Production, and
   Preview if staging should send reminders). Redeploy.
3. GitHub → Settings → Secrets and variables → Actions → New repository secret:
   `CRON_SECRET` (same value) and `REMINDERS_URL` =
   `https://www.studywithstudents.co.uk/api/cron/reminders`.
4. Actions → "Session reminders" → Run workflow; the log ends with `{"sent": …}`.

Locally, put `CRON_SECRET=…` in `.env` and call it with curl. Until the GitHub secrets exist, the
workflow skips itself without failing. GitHub may start scheduled runs a few minutes late and
pauses them after 60 days without commits (re-enable from the Actions tab). Real emails need the
`MAIL_*` settings.
