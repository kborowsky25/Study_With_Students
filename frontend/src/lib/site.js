// The public site's name, address and page titles and descriptions. The pages set them in
// the browser (MarketingPage, useMeta) and scripts/page-heads.mjs writes them into each
// page's HTML after the build, so search results and link previews match the page.
// Plain JavaScript with no imports: the build script loads it in Node.

export const SITE_NAME = 'Study with Students'
export const SITE_ORIGIN = 'https://www.studywithstudents.co.uk'
export const SHARE_IMAGE = '/og-image.png'

// Families pay this on top of the tutor's rate (server: Config.BOOKING_FEE_PERCENT)
export const BOOKING_FEE_PERCENT = 5

export const PAGES = {
  '/': {
    title: 'Tutors from top UK universities',
    description: 'Book GCSE and A-level tutors who study at top UK universities. Every tutor is verified and DBS checked, and tutors keep 100% of their rate.',
  },
  '/tutors': {
    title: 'GCSE and A-level tutors from UK universities',
    description: 'Browse tutors who study at UK universities. Filter by subject, level and university, compare rates and reviews, and book online. Tutors keep 100% of their rate.',
  },
  '/how-it-works': {
    title: 'How it works',
    description: `Find a tutor, book a session and pay securely. Families pay the tutor's rate plus a ${BOOKING_FEE_PERCENT}% booking fee, tutors keep 100%, and the student community is free.`,
  },
  '/become-tutor': {
    title: 'Become a tutor',
    description: 'Tutor GCSE and A-level students online while you study. Set your own rate and keep 100% of it. Verify your university and get an enhanced DBS check to start.',
  },
  '/founding-tutors': {
    title: 'Founding tutors',
    description: 'Be one of the first tutors on Study with Students: keep 100% of your rate, set your own price, and get verified and DBS checked.',
  },
  '/about': {
    title: 'About us',
    description: 'Study with Students is built by students who tutor. Why we started it, why tutors keep 100% of their rate, and what we are aiming for.',
  },
}
