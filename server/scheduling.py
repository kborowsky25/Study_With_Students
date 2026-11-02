"""Scheduling rules: weekly availability, bookable start times, clashes, policy constants.

Session times are stored as naive UK wall-clock times (what people pick in the browser), so
"now" is UK time too, even on servers that run in UTC. Weekly hours are kept as minutes after
midnight: (weekday 0 = Monday, 1020, 1200) is Monday 17:00–20:00.

Helpers that take a cursor expect a dictionary cursor.
"""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

TIMEZONE = 'Europe/London'

SLOT_STEP_MINUTES    = 30   # bookable start times are offered every half hour
DEFAULT_NOTICE_HOURS = 12   # how far ahead students must book; each tutor can change it
NOTICE_CHOICES       = (2, 6, 12, 24, 48)
FREE_CANCEL_HOURS    = 24   # students cancel free of charge until this long before a session
INTRO_MINUTES        = 15   # the free intro call
MAX_REPEAT_WEEKS     = 12
MAX_SLOT_WEEKS       = 12
MIN_WINDOW_MINUTES   = 30
MAX_SESSION_MINUTES  = 240

# Sessions in these states hold their time (and a proposed new time holds that one too)
HOLDING_STATUSES = ('pending', 'confirmed', 'paid')

WEEKDAYS = ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
DAY_PARTS = (('morning', 0, 12 * 60), ('afternoon', 12 * 60, 17 * 60), ('evening', 17 * 60, 24 * 60))

try:
    _TZ = ZoneInfo(TIMEZONE)
except ZoneInfoNotFoundError:  # no time zone database on this host: use the server clock
    _TZ = None


def local_now():
    """The current UK wall-clock time, naive, comparable with stored session times."""
    return datetime.now(_TZ).replace(tzinfo=None, microsecond=0)


# ── Weekly hours ──────────────────────────────────────────────────────────────

def parse_hhmm(value):
    """'17:30' → 1050 minutes after midnight; None when it isn't a time of day ('24:00' allowed)."""
    try:
        hours, minutes = (int(part) for part in str(value).split(':')[:2])
    except ValueError:
        return None
    total = hours * 60 + minutes
    return total if 0 <= hours <= 24 and 0 <= minutes < 60 and total <= 24 * 60 else None


def hhmm(minutes):
    return f'{minutes // 60:02d}:{minutes % 60:02d}'


def _minutes(value):
    """MySQL TIME arrives as a timedelta (or a string from some drivers)."""
    if isinstance(value, timedelta):
        return int(value.total_seconds() // 60)
    if isinstance(value, time):
        return value.hour * 60 + value.minute
    return parse_hhmm(value)


def normalise_windows(windows):
    """Sort weekly hours and merge ones that overlap or touch on the same day."""
    merged = []
    for weekday in range(7):
        spans = sorted((start, end) for day, start, end in windows if day == weekday)
        day_spans = []
        for start, end in spans:
            if day_spans and start <= day_spans[-1][1]:
                day_spans[-1][1] = max(day_spans[-1][1], end)
            else:
                day_spans.append([start, end])
        merged += [(weekday, start, end) for start, end in day_spans]
    return merged


def windows_json(windows):
    return [{'weekday': d, 'start': hhmm(s), 'end': hhmm(e)} for d, s, e in windows]


def load_windows(cur, tutor_id):
    cur.execute(
        "SELECT weekday, start_time, end_time FROM tutor_availability WHERE tutor_id = %s",
        (tutor_id,),
    )
    return normalise_windows([(int(r['weekday']), _minutes(r['start_time']), _minutes(r['end_time']))
                              for r in cur.fetchall()])


def load_blocked(cur, tutor_id, from_day=None):
    """Days off that haven't finished yet: [{'id', 'start_date', 'end_date', 'note'}]."""
    cur.execute("""
        SELECT id, start_date, end_date, note FROM tutor_blocked_dates
        WHERE tutor_id = %s AND end_date >= %s
        ORDER BY start_date, end_date
    """, (tutor_id, from_day or local_now().date()))
    return cur.fetchall()


def is_blocked(day, blocked):
    return any(b['start_date'] <= day <= b['end_date'] for b in blocked)


# ── Busy times and clashes ────────────────────────────────────────────────────

def busy_times(cur, user_ids, start, end, exclude_event_id=None):
    """Times taken by sessions of these users (as tutor or as student) between start and end."""
    ids = [u for u in user_ids if u]
    if not ids:
        return []
    marks = ', '.join(['%s'] * len(ids))
    cur.execute(f"""
        SELECT e.start_time, e.end_time, e.proposed_start, e.proposed_end
        FROM events e
        LEFT JOIN tutor_profiles   tp ON tp.id_tutor   = e.tutor_id
        LEFT JOIN student_profiles sp ON sp.id_student = e.student_id
        WHERE e.status IN ('pending', 'confirmed', 'paid')
          AND e.id_event <> %s
          AND (tp.id_user IN ({marks}) OR sp.id_user IN ({marks}))
          AND ((e.start_time < %s AND e.end_time > %s) OR (e.proposed_start < %s AND e.proposed_end > %s))
    """, (exclude_event_id or 0, *ids, *ids, end, start, end, start))
    taken = []
    for row in cur.fetchall():
        taken.append((row['start_time'], row['end_time']))
        if row['proposed_start'] and row['proposed_end']:
            taken.append((row['proposed_start'], row['proposed_end']))
    return taken


def overlaps(start, end, intervals):
    return any(s < end and start < e for s, e in intervals)


def open_slots(windows, blocked, busy, minutes, first_day, days, earliest):
    """Start times a session of `minutes` can be booked at, day by day from `first_day`:
    inside the weekly hours, not on a day off, clear of `busy`, and no sooner than `earliest`."""
    length = timedelta(minutes=minutes)
    step = timedelta(minutes=SLOT_STEP_MINUTES)
    found = set()
    for offset in range(days):
        day = first_day + timedelta(days=offset)
        if is_blocked(day, blocked):
            continue
        midnight = datetime.combine(day, time())
        for weekday, start, end in windows:
            if weekday != day.weekday():
                continue
            slot, stop = midnight + timedelta(minutes=start), midnight + timedelta(minutes=end)
            while slot + length <= stop:
                if slot >= earliest and not overlaps(slot, slot + length, busy):
                    found.add(slot)
                slot += step
    return sorted(found)


def slot_problem(start, minutes, *, windows, blocked, tutor_busy, student_busy, earliest):
    """Why a session can't start at `start`, or None if it can.

    'notice' too soon · 'away' tutor's day off · 'hours' outside the weekly hours (only checked
    when the tutor has set some) · 'tutor_busy' / 'student_busy' clashes with another session.
    """
    end = start + timedelta(minutes=minutes)
    if start < earliest:
        return 'notice'
    if is_blocked(start.date(), blocked):
        return 'away'
    if windows and start not in open_slots(windows, [], [], minutes, start.date(), 1, start):
        return 'hours'
    if overlaps(start, end, tutor_busy):
        return 'tutor_busy'
    if overlaps(start, end, student_busy):
        return 'student_busy'
    return None


# ── Intro calls and reliability ───────────────────────────────────────────────

def intro_call_available(cur, tutor_id, student_id):
    """One free intro call per tutor, before the first paid session with them.

    A declined or cancelled intro call doesn't use it up; one that's booked or happened does.
    """
    cur.execute("""
        SELECT
          SUM(kind = 'intro' AND status IN ('pending', 'confirmed', 'paid'))                  AS intros,
          SUM(kind <> 'intro' AND amount > 0
              AND (status = 'paid' OR (status = 'confirmed' AND end_time < %s)))           AS done
        FROM events
        WHERE tutor_id = %s AND student_id = %s
    """, (local_now(), tutor_id, student_id))
    row = cur.fetchone() or {}
    return not int(row.get('intros') or 0) and not int(row.get('done') or 0)


def tutor_cancellations(cur, tutor_id):
    """Confirmed sessions this tutor cancelled — the input for a future reliability score.

    Declined requests don't count. `late` ones were cancelled within FREE_CANCEL_HOURS.
    """
    cur.execute("""
        SELECT COUNT(*) AS total, COALESCE(SUM(cancel_type = 'late'), 0) AS late
        FROM events
        WHERE tutor_id = %s AND status = 'canceled' AND canceled_by = 'tutor'
          AND cancel_type IN ('canceled', 'late')
    """, (tutor_id,))
    row = cur.fetchone()
    return {'total': int(row['total']), 'late': int(row['late'])}


# ── Weekly hours as words ─────────────────────────────────────────────────────

def _join(words):
    return words[0] if len(words) == 1 else f"{', '.join(words[:-1])} & {words[-1]}"


def _days_label(days):
    """{0, 1, 2, 3, 4, 6} → 'weekday & Sunday', {4, 5, 6} → 'Friday & weekend';
    runs of three or more days read 'Monday to Wednesday'."""
    days = set(days)
    weekday = set(range(5)) <= days
    weekend = {5, 6} <= days
    days -= (set(range(5)) if weekday else set()) | ({5, 6} if weekend else set())
    words = ['weekday'] if weekday else []
    run = []
    for day in [*sorted(days), None]:
        if run and (day is None or day != run[-1] + 1):
            words += ([f'{WEEKDAYS[run[0]]} to {WEEKDAYS[run[-1]]}'] if len(run) >= 3
                      else [WEEKDAYS[d] for d in run])
            run = []
        if day is not None:
            run.append(day)
    return _join(words + (['weekend'] if weekend else []))


def availability_summary(windows):
    """Weekly hours in words the matching model understands, e.g. Monday–Friday 17:00–20:00 plus
    Sunday 13:00–17:00 → 'Weekday evenings, Sunday afternoons'. Empty when there are no hours."""
    days_by_part = {}
    for weekday, start, end in windows:
        overlap = {part: min(end, hi) - max(start, lo) for part, lo, hi in DAY_PARTS}
        # A part of the day counts when an hour of it is free (or all of a shorter window is)
        parts = [p for p, m in overlap.items() if m >= min(60, end - start)] or [max(overlap, key=overlap.get)]
        for part in parts:
            days_by_part.setdefault(part, set()).add(weekday)

    parts_by_days = {}
    for part, _, _ in DAY_PARTS:
        if part in days_by_part:
            parts_by_days.setdefault(frozenset(days_by_part[part]), []).append(part)

    phrases = []
    for days, parts in sorted(parts_by_days.items(), key=lambda item: (min(item[0]), -len(item[0]))):
        plural = _join([f'{p}s' for p in parts])
        phrases.append(f'{plural} every day' if len(days) == 7 else f'{_days_label(days)} {plural}')
    text = ', '.join(phrases)
    return (text[:1].upper() + text[1:])[:255]


# ── Small parsers shared by the routes ───────────────────────────────────────

def parse_dt(value):
    try:
        return datetime.fromisoformat(str(value).replace('Z', '')[:19])
    except (TypeError, ValueError):
        return None


def parse_day(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None
