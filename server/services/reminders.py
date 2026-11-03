"""Session reminder emails, 24 hours and 1 hour before. Run by POST /api/cron/reminders.

The tutor, the student and the student's linked parents (server/family.py) each get them; a
parent's has no video link. Every email is recorded in session_reminders (per session, reminder,
recipient and start time; a parent is 'p' + their user id) before it goes out, so overlapping
runs never send it twice, and moving a session re-arms them.
Without SMTP settings the emails are printed to the terminal.
"""
import smtplib
import traceback
from datetime import timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

from ..config import Config
from ..db import get_db
from ..routes.study_rooms import CALENDAR_PREFIX
from ..scheduling import local_now
from .email import mail_configured, smtp_send
from .ics import google_calendar_url, title_for

# (name, sent when the session starts in more than … and at most …)
REMINDERS = (
    ('1h',  timedelta(0),        timedelta(hours=1)),
    ('24h', timedelta(hours=2),  timedelta(hours=24)),   # skipped when the 1-hour one is close
)
MAX_PER_RUN = 50  # emails per run: well inside the serverless time limit, the rest go next run
PAGES = {'tutor': '/calendar/tutor', 'parent': '/hub/parent'}  # the student's is /calendar/student


def _due(cur, now):
    """Confirmed or paid 1-to-1 sessions starting within 24 hours (study-room copies excluded)."""
    cur.execute("""
        SELECT e.id_event, e.title, e.start_time, e.end_time, e.status, e.kind, e.amount, e.meeting_url,
               u_t.name AS tutor_name,   u_t.email AS tutor_email,
               u_s.name AS student_name, u_s.email AS student_email, sp.id_user AS student_user_id
        FROM events e
        JOIN tutor_profiles   tp  ON tp.id_tutor   = e.tutor_id
        JOIN users            u_t ON u_t.id_user   = tp.id_user
        JOIN student_profiles sp  ON sp.id_student = e.student_id
        JOIN users            u_s ON u_s.id_user   = sp.id_user
        WHERE e.status IN ('confirmed', 'paid')
          AND e.start_time > %s AND e.start_time <= %s
          AND COALESCE(e.title, '') NOT LIKE %s
        ORDER BY e.start_time
    """, (now, now + REMINDERS[-1][2], CALENDAR_PREFIX + '%'))
    due = []
    for ev in cur.fetchall():
        lead = ev['start_time'] - now
        due += [(ev, name) for name, after, until in REMINDERS if after < lead <= until]
    return due


def _when(ev, now):
    start = ev['start_time']
    day = ('Today' if start.date() == now.date()
           else 'Tomorrow' if start.date() == (now + timedelta(days=1)).date()
           else start.strftime('%A'))
    return day, f"{start:%H:%M}–{ev['end_time']:%H:%M}"


def _parents(cur, events):
    """{student user id: [{'user_id', 'email'}]} of the linked parents of these sessions' students."""
    ids = sorted({ev['student_user_id'] for ev, _ in events})
    if not ids:
        return {}
    cur.execute(f"""
        SELECT pl.child_user_id, u.id_user, u.email
        FROM parent_links pl JOIN users u ON u.id_user = pl.parent_user_id AND u.suspended_at IS NULL
        WHERE pl.status = 'accepted' AND pl.child_user_id IN ({', '.join(['%s'] * len(ids))})
        ORDER BY pl.id
    """, ids)
    parents = {}
    for row in cur.fetchall():
        parents.setdefault(row['child_user_id'], []).append({'user_id': row['id_user'], 'email': row['email']})
    return parents


def compose(ev, name, role, now):
    """Subject, HTML and plain text of one reminder for one side of a session (role: student,
    tutor or parent)."""
    day, hours = _when(ev, now)
    first = (ev.get('student_name') or '').split(' ')[0] or 'Your child'
    title = (f"{first}’s session: {ev.get('title') or 'Tutoring session'} with {ev.get('tutor_name')}"
             if role == 'parent' else title_for(ev, role))
    start = f"{ev['start_time']:%H:%M}"
    subject = f'{day} at {start}: {title}' if name == '24h' else f'Starting at {start}: {title}'
    date_line = f"{ev['start_time']:%A} {ev['start_time'].day} {ev['start_time']:%B}, {hours}"
    page = Config.FRONTEND_URL + PAGES.get(role, '/calendar/student')
    gcal = google_calendar_url(ev, 'student' if role == 'parent' else role)
    link = ev.get('meeting_url') if role != 'parent' else None
    unpaid = role != 'tutor' and ev['status'] == 'confirmed' and float(ev['amount'] or 0) > 0

    pay_line = ('Not paid yet: you can pay from your parent dashboard.' if role == 'parent'
                else 'Not paid yet: you can pay from Payments in the app.')
    button = (f'<a href="{escape(link)}" style="display:inline-block;background:#ff725e;color:#fff;'
              'padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Join the session</a>'
              if link else '')
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <p style="color:#ff725e;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px;">Session reminder</p>
      <h2 style="color:#1b263b;margin:0 0 6px;">{escape(title)}</h2>
      <p style="color:#556275;margin:0 0 22px;">{escape(date_line)}</p>
      {button}
      {f'<p style="color:#556275;font-size:13px;margin:18px 0 0;">{pay_line}</p>' if unpaid else ''}
      <p style="font-size:13px;margin:22px 0 0;">
        <a href="{escape(gcal)}" style="color:#556275;">Add to Google Calendar</a> ·
        <a href="{escape(page)}" style="color:#556275;">{'Open the parent dashboard' if role == 'parent' else 'Open your calendar'}</a>
      </p>
    </div>
    """
    text = '\n'.join(line for line in (
        title, date_line, f'Join: {link}' if link else '',
        pay_line if unpaid else '',
        f'Your calendar: {page}',
    ) if line)
    return subject, html, text


def send_email(to_email, subject, html, text):
    if not mail_configured():
        print(f'\n📧 [DEV EMAIL] To: {to_email} | {subject}\n{text}\n', flush=True)
        return
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg.attach(MIMEText(text, 'plain'))
    msg.attach(MIMEText(html, 'html'))
    smtp_send(msg, to_email)


def send_due_reminders(dry_run=False):
    """Send every reminder that's due and not sent yet. Returns counts (and, for a dry run, what
    would go out, without sending or recording anything)."""
    now = local_now()
    conn = get_db(); cur = conn.cursor(dictionary=True)
    sent, failed, preview = 0, 0, []
    try:
        due = _due(cur, now)
        parents = _parents(cur, due)
        for ev, name in due:
            recipients = [('student', 'student', ev['student_email']), ('tutor', 'tutor', ev['tutor_email'])]
            recipients += [(f"p{p['user_id']}", 'parent', p['email']) for p in parents.get(ev['student_user_id'], [])]
            for recipient, role, email in recipients:
                if sent + failed >= MAX_PER_RUN:
                    break
                key = (ev['id_event'], name, recipient, ev['start_time'])
                if dry_run:
                    cur.execute("SELECT 1 FROM session_reminders WHERE event_id = %s AND kind = %s "
                                "AND recipient = %s AND start_time = %s", key)
                    if not cur.fetchall():
                        preview.append({'event_id': ev['id_event'], 'reminder': name, 'to': role,
                                        'start_time': ev['start_time']})
                    continue

                # Claim it first: a run that overlaps this one finds the row and skips it
                cur.execute("INSERT IGNORE INTO session_reminders (event_id, kind, recipient, start_time) "
                            "VALUES (%s, %s, %s, %s)", key)
                claimed = cur.rowcount == 1
                conn.commit()
                if not claimed:
                    continue
                try:
                    send_email(email, *compose(ev, name, role, now))
                    sent += 1
                except (OSError, smtplib.SMTPException):
                    traceback.print_exc()
                    failed += 1
                    cur.execute("DELETE FROM session_reminders WHERE event_id = %s AND kind = %s "
                                "AND recipient = %s AND start_time = %s", key)
                    conn.commit()
    finally:
        cur.close(); conn.close()
    result = {'sent': sent, 'failed': failed, 'checked_at': now}
    if dry_run:
        result['due'] = preview
    return result
