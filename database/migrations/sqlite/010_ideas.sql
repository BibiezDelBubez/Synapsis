-- Sinapsi · Migrazione 010 · Idee orfane (cestino delle idee) con conversione in altri elementi

CREATE TABLE IF NOT EXISTS ideas (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id           INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    title             TEXT    NOT NULL,
    body              TEXT,
    kind              TEXT    NOT NULL DEFAULT 'other',
    priority          TEXT    NOT NULL DEFAULT 'normal',
    status            TEXT    NOT NULL DEFAULT 'open',
    tags              TEXT,
    chapter           INTEGER,
    converted_entity  TEXT,
    converted_id      INTEGER,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ideas_case ON ideas (case_id, status);
