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
