"""Calendar files (.ics, RFC 5545) and "Add to Google Calendar" links for sessions.

Session times are UK wall-clock times, so events carry TZID=Europe/London with its rules
included; calendar apps then show them right wherever the reader is.
"""
from datetime import UTC, datetime
from urllib.parse import urlencode

from ..config import Config
from ..scheduling import TIMEZONE

PRODID = '-//Study With Students//Sessions//EN'
UID_DOMAIN = 'studywithstudents.co.uk'

VTIMEZONE = [
    'BEGIN:VTIMEZONE', f'TZID:{TIMEZONE}',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0000', 'TZOFFSETTO:+0100', 'TZNAME:BST',
    'DTSTART:19700329T010000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0000', 'TZNAME:GMT',
    'DTSTART:19701025T020000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE',
]


def _stamp(dt):
    return dt.strftime('%Y%m%dT%H%M%S')


def _text(value):
    """Escape a TEXT value: backslash, semicolon, comma and line breaks."""
    return (str(value or '').replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,')
            .replace('\r\n', '\\n').replace('\n', '\\n'))


def _fold(line):
    """Lines longer than 75 octets continue on the next line, which starts with a space."""
    if len(line.encode()) <= 75:
        return line
    chunks, chunk, limit = [], '', 75
    for ch in line:
        if len((chunk + ch).encode()) > limit:
            chunks.append(chunk)
            chunk, limit = '', 74
        chunk += ch
    return '\r\n '.join([*chunks, chunk])


def title_for(ev, role):
    other = ev.get('student_name') if role == 'tutor' else ev.get('tutor_name')
    title = ev.get('title') or 'Tutoring session'
    return f'{title} with {other}' if other else title


def details_for(ev, role):
    page = '/calendar/tutor' if role == 'tutor' else '/calendar/student'
    lines = [f"Join: {ev['meeting_url']}"] if ev.get('meeting_url') else []
    lines.append(f'Study With Students: {Config.FRONTEND_URL}{page}')
    return '\n'.join(lines)


def calendar_file(events, role_of):
    """One VCALENDAR with a VEVENT per session. `role_of(ev)` is the reader's side of it."""
    stamp = datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', f'PRODID:{PRODID}', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
             'X-WR-CALNAME:Study With Students', *VTIMEZONE]
    for ev in events:
        role = role_of(ev)
        lines += [
            'BEGIN:VEVENT',
            f"UID:session-{ev['id_event']}@{UID_DOMAIN}",
            f'DTSTAMP:{stamp}',
            f"DTSTART;TZID={TIMEZONE}:{_stamp(ev['start_time'])}",
            f"DTEND;TZID={TIMEZONE}:{_stamp(ev['end_time'])}",
            f'SUMMARY:{_text(title_for(ev, role))}',
            f'DESCRIPTION:{_text(details_for(ev, role))}',
            f"STATUS:{'TENTATIVE' if ev['status'] == 'pending' else 'CONFIRMED'}",
        ]
        if ev.get('meeting_url'):
            lines += [f"LOCATION:{_text(ev['meeting_url'])}", f"URL:{ev['meeting_url']}"]
        lines.append('END:VEVENT')
    lines.append('END:VCALENDAR')
    return '\r\n'.join(_fold(line) for line in lines) + '\r\n'


def google_calendar_url(ev, role):
    params = {
        'action':  'TEMPLATE',
        'text':    title_for(ev, role),
        'dates':   f"{_stamp(ev['start_time'])}/{_stamp(ev['end_time'])}",
        'ctz':     TIMEZONE,
        'details': details_for(ev, role),
    }
    if ev.get('meeting_url'):
        params['location'] = ev['meeting_url']
    return f'https://calendar.google.com/calendar/render?{urlencode(params)}'
