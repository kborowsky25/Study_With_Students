# Safeguarding policy — DRAFT

> **Draft for review. Not legal advice.** Written as a starting point by the people building
> the app. Before relying on it, the owner should review it with someone trained in
> safeguarding and data protection, and settle the open decisions at the end.
> Last updated: 2 November 2026.

Study With Students connects university students (tutors, 18+) with school pupils, most of
whom are under 18. Sessions happen online. This page covers what we check about tutors, who
can see that information, how long we keep it, how to raise a concern, and the rules for
contact with under-18s.

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
     seen the original and made a decision (see section 6).
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
  straight away (contact to be set up, see section 6). Don't investigate, confront anyone or
  promise to keep it secret.
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
5. A parent or carer can ask to see their child's sessions and messages. *(Not built yet.)*
6. Tutors report anything worrying a student says to the safeguarding lead the same day.

Tutors agree to a code of conduct when they create a profile. That code still needs writing,
and should include these rules.

## 6. What the owner still needs to decide or do

1. **Appoint a safeguarding lead** and set up a contact for concerns (an email address and a
   "Report a concern" link in the app), plus a secure incident log outside the platform.
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
10. **Write the tutor code of conduct** and build the missing pieces: report-a-concern, parent
    visibility, account suspension, and flagging contact details in messages to under-18s.

## In the code

- API: `server/routes/background.py`. `dbs_verified_sql()` and `tutor_dbs_verified()` are
  the shared "has a verified, in-date check" rules for tutor listings and booking.
- Tutor page: `frontend/src/pages/BackgroundCheck.jsx`. Admin panel:
  `frontend/src/components/features/DbsReviewPanel.jsx`.
- Table: `background_checks` in `db/schema.sql`.
