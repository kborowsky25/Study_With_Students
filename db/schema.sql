-- Study With Students — canonical schema (MySQL 8).
-- Every statement is idempotent; the API also applies this on startup.

CREATE TABLE IF NOT EXISTS users (
  id_user                INT AUTO_INCREMENT PRIMARY KEY,
  name                   VARCHAR(255) NOT NULL,
  email                  VARCHAR(255) NOT NULL UNIQUE,
  password               VARCHAR(255) NOT NULL,
  xp                     INT NOT NULL DEFAULT 0,
  google_refresh_token   TEXT NULL,
  is_premium             TINYINT(1) NOT NULL DEFAULT 0,
  premium_expires_at     DATETIME NULL,
  stripe_customer_id     VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  created_at             TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS student_profiles (
  id_student         INT AUTO_INCREMENT PRIMARY KEY,
  id_user            INT NULL,
  age                INT NULL,
  about_me           TEXT NULL,
  education          TEXT NULL,
  education_level    VARCHAR(100) NULL,
  school_name        VARCHAR(200) NULL,
  study_year         VARCHAR(50) NULL,
  bio                TEXT NULL,
  stripe_customer_id VARCHAR(255) NULL,
  KEY ix_student_profiles_user (id_user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tutor_profiles (
  id_tutor           INT AUTO_INCREMENT PRIMARY KEY,
  id_user            INT NULL,
  age                INT NULL,
  university         VARCHAR(255) NULL,
  course             VARCHAR(255) NULL,
  about_me           TEXT NULL,
  subjects           VARCHAR(255) NULL,
  availability       VARCHAR(255) NULL,
  linkedin_url       VARCHAR(500) NULL,
  hourly_rate        DECIMAL(6,2) NOT NULL DEFAULT 20.00,
  screening_status   ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none',
  uni_email          VARCHAR(255) NULL,
  uni_email_verified TINYINT(1) NOT NULL DEFAULT 0,
  proof_doc_path     VARCHAR(500) NULL,
  screening_notes    TEXT NULL,
  avatar_path        VARCHAR(500) NULL,
  KEY ix_tutor_profiles_user (id_user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS liked_tutors (
  id_user  INT NOT NULL,
  id_tutor INT NOT NULL,
  liked    TINYINT(1) NOT NULL,
  PRIMARY KEY (id_user, id_tutor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS active_tutors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  id_user    INT NOT NULL,
  id_student INT NOT NULL,
  id_tutor   INT NOT NULL,
  KEY ix_active_tutors_user (id_user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS active_students (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_student INT NOT NULL,
  id_tutor   INT NOT NULL,
  is_active  TINYINT(1) NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_active_students_student (id_student)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tutor_requests (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  tutor_id   INT NOT NULL,
  status     ENUM('pending','accepted','declined') NULL DEFAULT 'pending',
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_tutor_requests_student (student_id),
  KEY ix_tutor_requests_tutor (tutor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  id_event    INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  tutor_id    INT NOT NULL,
  student_id  INT NOT NULL,
  title       VARCHAR(255) NULL,
  description TEXT NULL,
  start_time  DATETIME NOT NULL,
  end_time    DATETIME NOT NULL,
  amount      DECIMAL(10,2) NULL DEFAULT 20.00,
  booking_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status      ENUM('pending','confirmed','canceled','paid') NULL DEFAULT 'pending',
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_events_user (user_id),
  KEY ix_events_tutor (tutor_id),
  KEY ix_events_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS messages (
  id_message        INT AUTO_INCREMENT PRIMARY KEY,
  id_sender         INT NULL,
  id_receiver       INT NULL,
  message           TEXT NULL,
  message_timestamp DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  read_at           DATETIME NULL,
  KEY ix_messages_sender (id_sender),
  KEY ix_messages_receiver (id_receiver)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS forum_categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT NULL,
  icon        VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS forum_threads (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  user_id     INT NOT NULL,
  title       VARCHAR(200) NOT NULL,
  content     TEXT NOT NULL,
  created_at  DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_forum_threads_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS forum_posts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  thread_id  INT NOT NULL,
  user_id    INT NOT NULL,
  content    TEXT NOT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_forum_posts_thread (thread_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS study_rooms (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tutor_id    INT NOT NULL,
  subject     VARCHAR(150) NOT NULL,
  description TEXT NULL,
  start_time  DATETIME NOT NULL,
  end_time    DATETIME NOT NULL,
  zoom_link   VARCHAR(500) NULL,
  created_at  DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_study_rooms_start (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS classrooms (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tutor_id    INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  subject     VARCHAR(100) NULL,
  description TEXT NULL,
  capacity    INT NULL DEFAULT 30,
  start_time  DATETIME NULL,
  end_time    DATETIME NULL,
  zoom_link   VARCHAR(500) NULL,
  created_at  DATETIME NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS classroom_enrollments (
  classroom_id INT NOT NULL,
  student_id   INT NOT NULL,
  PRIMARY KEY (classroom_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS study_notes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  subject     VARCHAR(100) NULL,
  description TEXT NULL,
  file_path   VARCHAR(500) NULL,
  file_name   VARCHAR(255) NULL,
  file_type   VARCHAR(50) NULL,
  is_public   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_study_notes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_verifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  code       VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_email_verifications_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  event_id        INT NOT NULL UNIQUE,
  tutor_id        INT NOT NULL,
  student_user_id INT NOT NULL,
  rating          TINYINT NOT NULL,
  comment         TEXT NULL,
  created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_reviews_tutor (tutor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Lesson notes: one per session, written by the tutor once it has started.
-- `subject` is a key from server/data/topics.py (NULL when the subject isn't listed there).
CREATE TABLE IF NOT EXISTS lesson_notes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  event_id   INT NOT NULL UNIQUE,
  subject    VARCHAR(40) NULL,
  summary    TEXT NULL,
  next_steps TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Topics covered in a lesson, each with the tutor's confidence rating for the student (1–5).
CREATE TABLE IF NOT EXISTS lesson_note_topics (
  note_id    INT NOT NULL,
  subject    VARCHAR(40) NOT NULL,
  topic      VARCHAR(60) NOT NULL,
  confidence TINYINT NOT NULL,
  PRIMARY KEY (note_id, subject, topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Homework set in a lesson; the student ticks it off.
CREATE TABLE IF NOT EXISTS lesson_homework (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  note_id  INT NOT NULL,
  task     VARCHAR(300) NOT NULL,
  due_date DATE NULL,
  done_at  DATETIME NULL,
  KEY ix_lesson_homework_note (note_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Scheduling: a tutor's weekly bookable hours (weekday 0 = Monday … 6 = Sunday)
CREATE TABLE IF NOT EXISTS tutor_availability (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  tutor_id   INT NOT NULL,
  weekday    TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  KEY ix_tutor_availability_tutor (tutor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Days a tutor can't be booked (holidays, exams), inclusive ranges
CREATE TABLE IF NOT EXISTS tutor_blocked_dates (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  tutor_id   INT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  note       VARCHAR(120) NULL,
  KEY ix_tutor_blocked_dates_tutor (tutor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reminder emails already sent, per person and session time (moving a session re-arms them)
CREATE TABLE IF NOT EXISTS session_reminders (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  event_id   INT NOT NULL,
  kind       VARCHAR(8) NOT NULL,
  recipient  VARCHAR(10) NOT NULL,
  start_time DATETIME NOT NULL,
  sent_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_session_reminders (event_id, kind, recipient, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tutor background checks (DBS, England & Wales). One row per tutor: a resubmission
-- replaces a rejected or expired check. certificate_number, date_of_birth and the scan
-- are admin-only and are deleted once a check is reviewed (certificate_last4 stays).
CREATE TABLE IF NOT EXISTS background_checks (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  tutor_id           INT NOT NULL,
  check_type         ENUM('enhanced_barred','enhanced','standard','basic') NOT NULL,
  certificate_number CHAR(12) NULL,
  certificate_last4  CHAR(4) NOT NULL,
  issue_date         DATE NOT NULL,
  legal_name         VARCHAR(255) NOT NULL,
  date_of_birth      DATE NULL,
  on_update_service  TINYINT(1) NOT NULL DEFAULT 0,
  document_path      VARCHAR(255) NULL,
  consent_at         DATETIME NOT NULL,
  status             ENUM('pending','verified','rejected','expired') NOT NULL DEFAULT 'pending',
  reviewer_note      TEXT NULL,
  reviewed_by        VARCHAR(255) NULL,
  submitted_at       DATETIME NOT NULL,
  reviewed_at        DATETIME NULL,
  verified_at        DATETIME NULL,
  recheck_due        DATE NULL,
  UNIQUE KEY ux_background_checks_tutor (tutor_id),
  KEY ix_background_checks_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Parents: a parent or guardian (users.is_parent) invites their child by email and the child
-- accepts in the app. A child has at most two accepted parents (server/family.py).
-- child_user_id is filled in when the child answers; until then the invite waits for whoever
-- holds child_email, including someone who hasn't signed up yet.
CREATE TABLE IF NOT EXISTS parent_links (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  parent_user_id INT NOT NULL,
  child_email    VARCHAR(255) NOT NULL,
  child_user_id  INT NULL,
  status         ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  answered_at    DATETIME NULL,
  UNIQUE KEY ux_parent_links (parent_user_id, child_email),
  KEY ix_parent_links_child (child_user_id),
  KEY ix_parent_links_email (child_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messaging: someone a user has blocked can't message them (and they can't message back).
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id INT NOT NULL,
  blocked_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  KEY ix_user_blocks_blocked (blocked_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reports of a user, or of one of their messages, for the admin queue.
CREATE TABLE IF NOT EXISTS reports (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  reported_id INT NOT NULL,
  message_id  INT NULL,
  reason      VARCHAR(32) NOT NULL,
  note        TEXT NULL,
  status      ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  reviewed_by VARCHAR(255) NULL,
  admin_note  TEXT NULL,
  KEY ix_reports_status (status),
  KEY ix_reports_reported (reported_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
