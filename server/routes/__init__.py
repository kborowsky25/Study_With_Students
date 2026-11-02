from . import (
    admin, auth, classrooms, events, forum, messages,
    notes, payments, screening, study_rooms, tutors, users,
)

BLUEPRINTS = [
    auth.bp, tutors.bp, events.bp, messages.bp, forum.bp, study_rooms.bp,
    classrooms.bp, notes.bp, payments.bp, users.bp,
    screening.bp, admin.bp,
]
