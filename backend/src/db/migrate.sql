DROP TABLE IF EXISTS document_versions, yjs_updates, document_collaborators, documents, users CASCADE;

-- Users table: stores user credentials and profile info
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Documents table: stores document metadata
CREATE TABLE IF NOT EXISTS documents (
  id          VARCHAR(10) PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Role enum: permission levels for document access
DO $$ BEGIN
  CREATE TYPE role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Document collaborators: join table mapping users to documents with roles
CREATE TABLE IF NOT EXISTS document_collaborators (
  doc_id  VARCHAR(10) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    role NOT NULL,
  PRIMARY KEY (doc_id, user_id)
);

-- Yjs updates: binary keystroke updates from the collaboration engine
CREATE TABLE IF NOT EXISTS yjs_updates (
  id          SERIAL PRIMARY KEY,
  doc_id      VARCHAR(10) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  update_data BYTEA NOT NULL,
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Document versions: periodic compressed snapshots for fast document loading
CREATE TABLE IF NOT EXISTS document_versions (
  id          SERIAL PRIMARY KEY,
  doc_id      VARCHAR(10) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  snapshot    BYTEA NOT NULL,
  label       VARCHAR(100),
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);
