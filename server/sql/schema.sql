-- Basic CRM System (Client Management & Job Tracking) — PostgreSQL schema
-- Run with: psql <connection_string> -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- users: admins and employees share one table, distinguished by role.
-- `role` is the SYSTEM permission (admin/employee). `position` is the
-- employee's job title (e.g. "Field Technician") — kept separate so the
-- two "role" concepts in the spec (system access vs. job title) don't collide.
-- ---------------------------------------------------------------
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  fullname       VARCHAR(150) NOT NULL,
  email          VARCHAR(150) UNIQUE NOT NULL,
  password       VARCHAR(255) NOT NULL,        -- bcrypt hash
  role           VARCHAR(20) NOT NULL DEFAULT 'employee', -- 'admin' | 'employee'
  department     VARCHAR(100),
  position       VARCHAR(100),
  avatar_url     VARCHAR(255),
  status         VARCHAR(20) NOT NULL DEFAULT 'Active',   -- 'Active' | 'Inactive'
  reset_token    VARCHAR(255),
  reset_expires  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------
CREATE TABLE customers (
  id             SERIAL PRIMARY KEY,
  firstname      VARCHAR(100) NOT NULL,
  lastname       VARCHAR(100) NOT NULL,
  company        VARCHAR(150),
  email          VARCHAR(150),
  phone          VARCHAR(50),
  address        VARCHAR(255),
  city           VARCHAR(100),
  country        VARCHAR(100),
  notes          TEXT,
  -- Admin-customizable pipeline; defaults to the 8 stages from the spec.
  -- 'New Lead' | 'Contacted' | 'Follow Up' | 'In Progress' |
  -- 'Waiting for Client' | 'Completed' | 'Cancelled' | 'Archived'
  status         VARCHAR(30) NOT NULL DEFAULT 'New Lead',
  assigned_to    INTEGER REFERENCES users(id),
  created_by     INTEGER REFERENCES users(id),
  last_contact   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- customer_code (CUS-1000+id) is derived, not stored — see customer.routes.js

-- ---------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------
CREATE TABLE jobs (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  assigned_to  INTEGER REFERENCES users(id),
  assigned_by  INTEGER REFERENCES users(id),
  priority     VARCHAR(20) NOT NULL DEFAULT 'Medium', -- 'Low' | 'Medium' | 'High'
  -- Kanban columns: 'To Do' | 'In Progress' | 'Review' | 'Completed'
  status       VARCHAR(20) NOT NULL DEFAULT 'To Do',
  progress     SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  deadline     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- job code (JOB-1000+id) is derived, not stored — see job.routes.js

-- ---------------------------------------------------------------
-- notes: running notes/comments left on a job
-- ---------------------------------------------------------------
CREATE TABLE notes (
  id          SERIAL PRIMARY KEY,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- files: uploaded documents, attached to a customer and/or a job
-- ---------------------------------------------------------------
CREATE TABLE files (
  id             SERIAL PRIMARY KEY,
  customer_id    INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  job_id         INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  filename       VARCHAR(255) NOT NULL,   -- original filename shown in the UI
  filepath       VARCHAR(255) NOT NULL,   -- stored filename / storage key
  size_bytes     INTEGER,
  uploaded_by    INTEGER REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- activity_logs: full audit trail — powers both the customer timeline
-- and the admin's global Activity Logs page. entity_type/entity_id are
-- an addition beyond the spec's bare (user_id, action, description) shape,
-- so a single table can answer "everything that happened to customer #4"
-- as well as "everything that happened today".
-- ---------------------------------------------------------------
CREATE TABLE activity_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id),   -- null = system-generated
  action       VARCHAR(100) NOT NULL,
  description  TEXT,
  entity_type  VARCHAR(30),                    -- 'customer' | 'job' | 'file' | 'employee'
  entity_id    INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- notifications: persisted per-user notifications (job assigned, file
-- uploaded, etc.) so the Notifications page shows history, not just
-- whatever arrived over the socket while the tab was open.
-- ---------------------------------------------------------------
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  title       VARCHAR(150) NOT NULL,
  body        VARCHAR(255),
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_assigned ON customers(assigned_to);
CREATE INDEX idx_jobs_assigned ON jobs(assigned_to);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_files_customer ON files(customer_id);
CREATE INDEX idx_files_job ON files(job_id);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_set_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
