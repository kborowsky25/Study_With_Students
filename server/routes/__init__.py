from . import (
    admin,
    auth,
    availability,
    background,
    classrooms,
    cron,
    events,
    forum,
    learning,
    messages,
    notes,
    payments,
    progress,
    referrals,
    reviews,
    screening,
    study_rooms,
    tutors,
    users,
)

BLUEPRINTS = [
    auth.bp, tutors.bp, learning.bp, availability.bp, events.bp, reviews.bp, progress.bp,
    messages.bp, forum.bp, study_rooms.bp, classrooms.bp, notes.bp, payments.bp, users.bp,
    background.bp, screening.bp, admin.bp, cron.bp, referrals.bp,
]
