from . import (
    admin, auth, classrooms, events, forum, membership, messages,
    notes, payments, screening, study_rooms, tutors, users,
)

BLUEPRINTS = [
    auth.bp, tutors.bp, events.bp, messages.bp, forum.bp, study_rooms.bp,
    classrooms.bp, notes.bp, payments.bp, membership.bp, users.bp,
    screening.bp, admin.bp,
]
