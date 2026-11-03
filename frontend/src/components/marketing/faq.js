// Questions and answers for the public pages: the homepage shows the first few, How it
// works shows them all.
import { BOOKING_FEE_PERCENT as FEE } from '../../lib/site'

export const FAQ = [
  ['Is it free to join?', `Yes. Joining is free, and so is the community: the forum, study notes, study rooms and live classes. When you book a session, you pay your tutor's rate plus a ${FEE}% booking fee.`],
  ['Do you take a cut of tutoring?', `No. Tutors keep 100% of their rate. The ${FEE}% booking fee is added on top, and it's how we keep the site running.`],
  ['How are tutors checked?', 'Every tutor is a verified university student: they confirm a university email and upload proof of enrolment, which we review. Every tutor also has an enhanced DBS check before they can take bookings.'],
  ['When do I pay?', 'Once your tutor has confirmed the session. You pay by card, through Stripe, and you see the booking fee before you pay.'],
  ['How do parents follow along?', 'A parent account links to their child once the child accepts. You then see their sessions, progress and payments in one place. Students under 18 need a linked parent before any session is booked.'],
  ['What is an enhanced DBS check?', 'A criminal record check from the Disclosure and Barring Service. The enhanced level also includes any relevant information held by local police.'],
  ['Can I be both a student and a tutor?', 'Yes. Once you are verified as a tutor you can switch between student mode and tutor mode at any time.'],
]
