CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  randomize_items BOOLEAN NOT NULL DEFAULT TRUE,
  item_limit INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60
);

CREATE TABLE IF NOT EXISTS project_themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  randomize_items BOOLEAN NOT NULL DEFAULT TRUE,
  item_limit INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER NOT NULL DEFAULT 120
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB,
  correct_answer INTEGER,
  weight INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS project_cases (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL REFERENCES project_themes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB NOT NULL,
  allowed_formats JSONB NOT NULL,
  max_size INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_code TEXT UNIQUE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  school TEXT NOT NULL,
  institution TEXT NOT NULL,
  exam_theme TEXT REFERENCES themes(id),
  project_theme TEXT REFERENCES project_themes(id),
  project_case TEXT REFERENCES project_cases(id),
  status TEXT NOT NULL DEFAULT 'biodata',
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exam_started_at TIMESTAMPTZ,
  project_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer JSONB,
  score INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id, question_id)
);

CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL REFERENCES project_themes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  drive_folder_id TEXT,
  drive_file_id TEXT,
  drive_file_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score INTEGER,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
ALTER TABLE project_submissions ADD COLUMN IF NOT EXISTS drive_file_url TEXT;
ALTER TABLE themes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE project_themes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE themes ADD COLUMN IF NOT EXISTS randomize_items BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE project_themes ADD COLUMN IF NOT EXISTS randomize_items BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE themes ADD COLUMN IF NOT EXISTS item_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_themes ADD COLUMN IF NOT EXISTS item_limit INTEGER NOT NULL DEFAULT 1;
ALTER TABLE themes ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE project_themes ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 120;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS project_case TEXT REFERENCES project_cases(id);

INSERT INTO project_themes (id, name, description, icon)
SELECT DISTINCT t.id, t.name, t.description, t.icon
FROM themes t
WHERE EXISTS (SELECT 1 FROM project_cases pc WHERE pc.theme_id = t.id)
   OR EXISTS (SELECT 1 FROM participants p WHERE p.project_theme = t.id)
   OR EXISTS (SELECT 1 FROM project_submissions ps WHERE ps.theme_id = t.id)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE IF EXISTS project_cases DROP CONSTRAINT IF EXISTS project_cases_theme_id_fkey;
ALTER TABLE IF EXISTS project_cases
  ADD CONSTRAINT project_cases_theme_id_fkey
  FOREIGN KEY (theme_id) REFERENCES project_themes(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS participants DROP CONSTRAINT IF EXISTS participants_project_theme_fkey;
ALTER TABLE IF EXISTS participants
  ADD CONSTRAINT participants_project_theme_fkey
  FOREIGN KEY (project_theme) REFERENCES project_themes(id);

ALTER TABLE IF EXISTS project_submissions DROP CONSTRAINT IF EXISTS project_submissions_theme_id_fkey;
ALTER TABLE IF EXISTS project_submissions
  ADD CONSTRAINT project_submissions_theme_id_fkey
  FOREIGN KEY (theme_id) REFERENCES project_themes(id) ON DELETE CASCADE;
