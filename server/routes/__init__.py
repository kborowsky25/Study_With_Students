from . import (
    admin,
    auth,
    classrooms,
    events,
    forum,
    learning,
    membership,
    messages,
    notes,
    payments,
    reviews,
    screening,
    study_rooms,
    tutors,
    users,
)

BLUEPRINTS = [
    auth.bp, tutors.bp, learning.bp, events.bp, reviews.bp, messages.bp, forum.bp,
    study_rooms.bp, classrooms.bp, notes.bp, payments.bp, membership.bp, users.bp,
    screening.bp, admin.bp,
]
