# Safeguarding policy — DRAFT

> **Draft for review. Not legal advice.** Written as a starting point by the people building
> the app. Before relying on it, the owner should review it with someone trained in
> safeguarding and data protection, and settle the open decisions at the end.
> Last updated: 2 November 2026.

Study With Students connects university students (tutors, 18+) with school pupils, most of
whom are under 18. Sessions happen online. This page covers what we check about tutors, who
can see that information, how long we keep it, how to raise a concern, the rules for contact
with under-18s, and what the app enforces about parents and messages.

## 1. What we check

**University status.** Tutors verify a university email address and upload proof of
enrolment. An admin approves it (`tutor_profiles.screening_status = 'approved'`).

**An enhanced DBS check (England & Wales), before anyone can book them.**

- We accept an **Enhanced check with the children's barred list** (preferred) or an
  **Enhanced** check. We don't accept basic or standard checks: they aren't the right level
  for working with children.
- Tutors provide a certificate they already hold. We can't issue checks. GOV.UK guidance (live
  from 21 January 2026) says a self-employed person can get an enhanced check, with barred lists,
  on themselves through a DBS umbrella body, if the role is eligible
  ([private individuals and self-employed workers](https://www.gov.uk/guidance/private-individuals-employing-self-employed-workers-or-personal-employees),
  [find an umbrella body](https://www.gov.uk/find-dbs-umbrella-body)).
- The certificate must be from the last 3 years, unless it's on the DBS Update Service.
- The tutor consents to the check when they submit it. The consent time is stored.

**How an admin verifies a check**

1. Read the details in the review panel (and the scan, if there is one). The certificate should
   be for the child workforce ("Child Workforce" in the position applied for).
2. If the certificate is on the Update Service, run the free
   [status check](https://secure.crbonline.gov.uk/crsc/check) with the certificate number, the
   holder's current surname and date of birth. GOV.UK's
   [employer guide](https://www.gov.uk/government/publications/dbs-update-service-employer-guide/dbs-update-service-employer-guide)
   explains the results:
   - *"did not reveal any information and remains current"*: verify.
   - *"remains current as no further information has been identified since its issue"*: the
     original certificate disclosed something. Don't verify until the safeguarding lead has
     seen the original and made a decision (see section 7).
   - *"no longer current"*: reject and ask for a new check.
   - *"details entered do not match"*: reject with a note so the tutor can correct them.
3. Verify or reject in the panel. Rejecting always needs a note, and the tutor sees it, so keep
   it factual and never mention what a certificate disclosed.

**Rechecks.** A check on the Update Service is rechecked a year after it's verified. Otherwise
it counts for 3 years from its issue date. When a recheck is due the check expires, the tutor
can't be booked, and they submit their details again.

**Revoking.** If a concern is raised about a verified tutor, an admin can revoke the check from
the review panel. The tutor can't be booked from that moment.

## 2. Who sees what

| Information | Tutor | Admin | Students and parents |
| --- | --- | --- | --- |
| Check type, status, issue date, recheck date | Yes | Yes | A "DBS checked" badge |
| Certificate number | Last 4 digits | In full, until reviewed | No |
| Date of birth | No | Until reviewed | No |
| Uploaded scan | No | Until reviewed | No |
| Reviewer's note | Yes | Yes | No |

Only the super-admin account (or the admin key) can use the review endpoints. The scan is
served with `Cache-Control: no-store` and is never publicly linked.

## 3. How long we keep it

- **Deleted as soon as a check is verified or rejected:** the certificate number, the date of
  birth and the uploaded scan. Only the last 4 digits of the number stay. The app does this
  automatically.
- **Kept as the record that a check happened:** check type, issue date, name on certificate,
  Update Service yes/no, consent time, status, reviewer's note, who reviewed it and when, and
  the recheck date. *Owner to decide how long to keep this after a tutor leaves.*
- **Never stored:** what a certificate disclosed. Decisions about a disclosure are recorded
  outside the platform, securely, by the safeguarding lead.
- Database backups can still hold deleted values until they rotate. Keep backups short-lived.
- Scans are stored on the server's disk. On Vercel that's `/tmp`, which doesn't persist.
  Production needs private, encrypted object storage before scans are relied on.

## 4. Reporting a concern

- **A child is in immediate danger:** call 999.
- **Worried about a child, or about a tutor's behaviour:** tell the platform's safeguarding lead
  straight away (contact to be set up, see section 7). Don't investigate, confront anyone or
  promise to keep it secret.
- **About something in messages:** report the person or the message from the conversation's ⋯
  menu. It goes to Admin → Reports with the conversation attached (section 6).
- **Allegations against a tutor** go to the Local Authority Designated Officer (LADO) for the
  child's area. The safeguarding lead revokes the tutor's check while it's looked into.
- **Online sexual abuse or grooming** can also be reported to
  [CEOP](https://www.ceop.police.uk).
- **Advice:** NSPCC helpline 0808 800 5000. Children can call Childline on 0800 1111.
- Organisations that remove someone from regulated activity because they harmed a child, or
  posed a risk of harm, may have a legal duty to refer them to DBS. The owner should confirm
  whether this applies to the platform.

## 5. Contact with under-18s

1. Talk only through platform messages and the session link. No phone numbers, WhatsApp,
   Snapchat, social media or personal email.
2. Messages are about learning and scheduling. Nothing personal, no gifts, no meeting up.
3. Sessions are online, at the booked time, through the platform. No in-person sessions
   arranged through the platform.
4. Don't record sessions or share images of a student without written consent from a parent.
5. A parent or carer can link their account to their child's and see their sessions, progress
   and messages with tutors (section 6).
6. Tutors report anything worrying a student says to the safeguarding lead the same day.

Tutors agree to a code of conduct when they create a profile. That code still needs writing,
and should include these rules.

## 6. What the app enforces

**Ages.** Students give their date of birth when they sign up (`student_profiles.date_of_birth`),
and under-18 is worked out from it every time, so nobody stays "under 18" by mistake. Accounts
from before sign-up asked for it have no date of birth and are treated as adults; they can add
one, once, on their profile. A date of birth can't be changed by the user afterwards (it would
undo the rules below). It is self-declared: we don't verify it.

**Parents and guardians.**

- Someone signs up as a parent or guardian (confirming they're one, aged 18 or over), or a
  student adds parent mode to their account. Under-18s can't.
- The parent invites their child by email. The child accepts or declines in the app, after a
  dialog that spells out what the parent will see. A child has at most two linked parents, and
  either side can unlink at any time. The reply to an invite is the same whether or not that
  email has an account, so invites can't be used to find out who is signed up. Invites from
  someone the child has blocked are hidden from them.
- A linked parent sees their child's sessions (not the video link), lesson notes, homework and
  progress, can read (never write in) their child's conversations with tutors, gets the session
  reminder emails, and can pay for sessions. Their child's other conversations stay private.
- **Under-18s need a linked parent before any session can be booked**, including the free intro
  call, whether the student or the tutor is booking. Under-18s rarely pay by card themselves, so
  a parent is usually involved anyway; the rule makes sure every 1-to-1 session with a child has
  a parent who can see it and read the messages around it. The student's home page tells them
  how to get a parent linked.

**Who can message whom.** Anyone may write to a verified tutor (approved screening, and not
under 18). A verified tutor may write to the students who asked for them and whose request they
accepted. Anyone may reply to someone who wrote to them first. Nothing else starts a
conversation, so nobody can cold-message an under-18: only the tutors they asked for, and people
they wrote to themselves, can message them. Parents can't message students (including their own
child) and students can't message other students. The people search only finds people you're
allowed to write to, and a refusal never says whether someone is under 18.

**Contact details.** In messages between a tutor and a student or parent, and in any
conversation with an under-18, phone numbers (also spaced out or spelled in words), email
addresses (also "at"/"dot" spellings) and off-platform handles and links (WhatsApp, wa.me,
Snapchat, Instagram, TikTok, Telegram, Discord, Kik, WeChat, Facebook/Messenger, X…) are
replaced with "[contact details hidden]". Times, prices, dates and exam paper codes are left
alone. The original text is kept for moderation (`messages.original_message`) and is only shown
to admins. Everyone else, including a reading parent, sees the hidden version.

**Both sides know when a parent can read.** A conversation between a tutor and a child with a
linked parent says so quietly in its header ("Visible to Maya's parent").

**Report and block.**

- Anyone can report a person, or a message they received from them, with a reason (including
  "I'm worried about someone's safety", which also says to call 999 in an emergency) and an
  optional note. A linked parent can report a message sent to their child.
- Reports go to Admin → Reports, which shows the report, the conversation around it (with the
  original text of hidden contact details) and how many reports the person has had. An admin
  resolves or dismisses each report with a note; who closed it and when is recorded.
- Admin → Reports → "Contact details hidden" lists the latest messages where the guard fired,
  with what was actually written. A tutor who keeps trying is a warning sign.
- Blocking someone stops messages both ways until it's undone (from the conversation's menu).

**What it can't stop.** A child can give a false date of birth, or make a second account and
"invite" themselves as their own parent. The rules make parental visibility the default, not a
guarantee. Determined people can also get contact details past the guard (for example a
username with no digits in the middle of a sentence), which is why the original text is kept
and reviewable.

## 7. What the owner still needs to decide or do

1. **Appoint a safeguarding lead** and set up a contact for concerns (an email address, plus a
   "Report a concern" link outside messages, e.g. for sessions and the forum), a secure incident
   log outside the platform, and how quickly reports in Admin → Reports are looked at.
2. **Check legal entitlement.** GOV.UK requires anyone doing a status check to be legally
   entitled to see that level of certificate, and enhanced checks with barred lists depend on
   the role being eligible (regulated activity). Confirm the platform's role here. If it isn't
   entitled, parents can run the status check themselves (as a "private employer", with the
   tutor's consent), and the platform would only record that it happened.
3. **Seeing the original certificate.** GOV.UK's employer guide says to view the original
   certificate, and that copies or video calls aren't enough. Decide how to handle this, for
   example by requiring the Update Service for every tutor and treating a scan as supporting
   evidence only.
4. **Certificates that disclose information.** Decide who assesses them, how, and how the
   decision is recorded, without storing the disclosure in the platform.
5. **Data protection.** DBS certificates are criminal offence data (UK GDPR Article 10). Pick
   the Data Protection Act 2018 Schedule 1 condition (likely "safeguarding of children"), write
   the appropriate policy document it needs, update the privacy notice, pay the ICO data
   protection fee, and consider a DPIA. The ICO Children's code applies to a service used by
   children.
6. **Online Safety Act 2023.** Messaging and the forum make this a user-to-user service used by
   children. Check the Ofcom duties, including the children's risk assessment.
7. **Other parts of the UK.** DBS covers England and Wales. Decide whether to accept Disclosure
   Scotland (PVG) and AccessNI checks.
8. **Paying for checks later.** If the platform starts requesting checks for tutors, it does so
   through an umbrella body or by registering with DBS. It then becomes responsible for
   eligibility, ID checks and the DBS Code of Practice.
9. **Retention periods** for the check record (section 3) and for backups.
10. **Write the tutor code of conduct** and build the missing pieces: account suspension (an
    admin can only resolve reports and revoke DBS checks today), and reporting outside messages.
11. **Under-13s.** Sign-up accepts anyone aged 5 or over. Decide whether under-13s may sign up
    themselves (UK GDPR consent age is 13) or only through a parent, and say so in the privacy
    notice.
12. **Reading messages for moderation.** Admins can read reported conversations and the
    original text of hidden contact details, and parents can read their child's conversations
    with tutors. Cover both in the privacy notice and the terms, and decide how long reports and
    the hidden originals are kept.

## In the code

- API: `server/routes/background.py`. `dbs_verified_sql()` and `tutor_dbs_verified()` are
  the shared "has a verified, in-date check" rules for tutor listings and booking.
- Tutor page: `frontend/src/pages/BackgroundCheck.jsx`. Admin panel:
  `frontend/src/components/features/DbsReviewPanel.jsx`.
- Table: `background_checks` in `db/schema.sql`.
- Parents and ages: `server/family.py` (the rules), `server/routes/family.py` (invites, links and
  the parent's views). The booking rule is in `create_event` (`server/routes/events.py`). Pages:
  `frontend/src/pages/HubParent.jsx`, `frontend/src/components/features/FamilyCard.jsx`.
- Messages: `CAN_WRITE` in `server/routes/messages.py` is the one who-can-write rule (sending,
  the thread's reply box and the people search). The contact-detail guard is
  `server/contact_details.py`, tested in `tests/test_contact_details.py`.
- Report and block: `server/routes/safety.py`; admin panel
  `frontend/src/components/features/ReportsPanel.jsx`.
- Tables: `parent_links`, `user_blocks`, `reports` in `db/schema.sql`; columns `users.is_parent`,
  `student_profiles.date_of_birth` and `messages.original_message` in `server/schema.py`.
