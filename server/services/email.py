"""Transactional email. Without SMTP settings, codes are printed to the terminal."""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import parseaddr

from ..config import Config


def mail_configured():
    return bool(Config.MAIL_SERVER and Config.MAIL_USERNAME)


def smtp_send(msg, to_email):
    """Send `msg` (its Subject and body set) through the configured SMTP server."""
    sender = Config.MAIL_FROM or Config.MAIL_USERNAME
    msg['From'] = sender
    msg['To']   = to_email
    with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
        server.sendmail(parseaddr(sender)[1], to_email, msg.as_string())


def send_verification_email(to_email, code):
    if not mail_configured():
        print(f'\n📧 [DEV EMAIL] To: {to_email} | Verification code: {code}\n', flush=True)
        return

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#1b263b;margin-bottom:8px;">Your Study with Students code</h2>
      <p style="color:#666;margin-bottom:24px;">Enter this code to verify your email.</p>
      <div style="background:#f4f6fb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#ff725e;">{code}</span>
      </div>
      <p style="color:#999;font-size:13px;">This code expires in 10 minutes. Didn't request this? Ignore this email.</p>
    </div>
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'{code} — your Study with Students verification code'
    msg.attach(MIMEText(html, 'html'))
    smtp_send(msg, to_email)
