# Study With Students — CLAUDE.md

## Project Overview
Peer tutoring platform with **0% commission**. React frontend + Flask REST API backend.

## Branch Guide
- `main` — Legacy Flask + Jinja template app (`app.py` + `templates/`)
- `Secondary` — New React SPA (`frontend/`) + Flask REST API (`api.py`)

## Architecture (Secondary branch)
```
/
├── api.py             Flask REST API (JWT-authenticated, CORS-enabled)
├── requirements.txt   Python deps
└── frontend/          React SPA
    ├── src/
    │   ├── api/       Axios API client layer
    │   ├── context/   AuthContext (JWT storage)
    │   ├── components/
    │   │   ├── layout/  Navbar, Sidebar, HubLayout, Footer
    │   │   └── features/ TutorCard, EventCard
    │   └── pages/     One file per route
    ├── tailwind.config.js
    └── vite.config.js
```

## Running Locally

**Backend (Flask API):**
```bash
pip install -r requirements.txt
python -m flask --app api run --debug
# → http://localhost:5000
```

**Frontend (React):**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
# Vite proxies /api/* → localhost:5000
```

## Tech Stack
- **Frontend**: React 18, Vite 5, TanStack Router v1, Tailwind CSS 3, Axios, react-hot-toast
- **Backend**: Flask 3, flask-jwt-extended, flask-cors, mysql-connector-python
- **Database**: MySQL — `users_tutoring` on localhost
- **Auth**: JWT (7-day tokens stored in localStorage under `sws_token`)

## Design System
- Primary dark background: `#1b263b` (navy-500 in Tailwind)
- Primary accent: `#ff725e` (coral-400 in Tailwind)
- Secondary: `#b0bec5` (slate)
- Font: Noto Sans JP
- Components: glassmorphism cards (`.glass`), dark sidebar, mobile bottom nav

## Database Schema (key tables)
```sql
users            (id_user, name, email, password)
tutor_profiles   (id_tutor, id_user, age, university, course, about_me, subjects, availability)
student_profiles (id_student, id_user, stripe_customer_id)
liked_tutors     (id_user, id_tutor, liked)
active_tutors    (id_student, id_tutor)
active_students  (id_tutor, id_student)
events           (id_event, user_id, tutor_id, student_id, title, description, start_time, end_time, status, amount)
messages         (id_message, id_sender, id_receiver, message, message_timestamp)
forum_categories (id, name, description)
forum_threads    (id, category_id, user_id, title, content, created_at)
forum_posts      (id, thread_id, user_id, content, created_at)
study_rooms      (id, tutor_id, subject, description, start_time, end_time, zoom_link)
```

## Auth Flow
1. `POST /api/auth/register` → creates user + student_profile
2. `POST /api/auth/login`    → returns `{ access_token, user: { id, name, email, is_tutor } }`
3. React stores token in `localStorage['sws_token']`
4. All API requests use `Authorization: Bearer <token>`
5. 401 responses → auto-logout + redirect to `/login`

## Role System
- **Dual role**: A user can be both student AND tutor simultaneously
- `is_tutor` = true if a `tutor_profiles` row exists for that user
- `/hub` redirects: `is_tutor` → `/hub/tutor`, else → `/hub/student`
- Hub has a "Switch to X view" toggle in the sidebar if `is_tutor`

## API Endpoints
All prefixed with `/api/`. All protected routes require `Authorization: Bearer <token>`.

Auth: POST /auth/register, POST /auth/login, GET /auth/me
Tutors: GET /tutors, GET /tutors/:id, POST /tutors/:id/like, POST|DELETE /tutors/:id/activate
Tutor profile: GET|POST /tutor-profile
Active: GET /liked-tutors, GET /active-tutors, GET /active-students
Events: GET|POST /events, PUT /events/:id/status
Messages: GET|POST /messages, GET /messages/:userId
Forum: GET /forum/categories, GET|POST /forum/categories/:id/threads, GET|POST /forum/threads/:id/posts
Study rooms: GET|POST /study-rooms, POST /study-rooms/:id/calendar
Payments: GET /payments, POST /payments/setup

## Frontend Routes
Protected routes redirect to `/login` if no JWT found.

Public: /, /login, /signup, /about, /how-it-works, /become-tutor
Hub: /hub (redirect), /hub/student, /hub/tutor
Tutors: /find-tutors, /tutor/:id, /tutor-profile, /active-tutors, /liked-tutors
Students: /active-students, /dashboard
Comms: /messages, /forum, /forum/category/:id, /forum/thread/:id, /forum/category/:id/new
Study: /study-rooms/student, /study-rooms/tutor, /calendar/student, /calendar/tutor
Other: /payments, /events

## Conventions
- All API calls go through `src/api/client.js` (axios with JWT interceptor)
- 401 from API → auto-logout + redirect to `/login`
- Pages use `HubLayout` for authenticated pages (includes Sidebar)
- Public pages include `Navbar` + `Footer`
- `toast.error/success` from `react-hot-toast` for all user feedback
- Mobile: sidebar → bottom nav bar (5 primary links)
- SQL must always be parameterized — never string-interpolate user input

## Environment Variables (Flask)
```bash
SECRET_KEY=your-secret
JWT_SECRET_KEY=your-jwt-secret
DB_HOST=localhost
DB_NAME=users_tutoring
DB_USER=root
DB_PASSWORD=yourpassword
```
Create a `.env` file (not committed) and load with python-dotenv if needed.

## Stripe
- Keys should be in environment variables (not committed)
- See `/api/payments/setup` endpoint in api.py for integration point
- Stripe.js not yet wired in frontend Payments.jsx — add when keys are ready
