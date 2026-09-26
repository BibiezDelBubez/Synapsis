-- Sinapsi · Migrazione 002 · Archivio: Personaggi, Luoghi, Asset
-- Ogni tabella appartiene a un caso: eliminando il caso si eliminano anche i suoi dati.

CREATE TABLE IF NOT EXISTS characters (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    alias        TEXT,
    role         TEXT,
    status       TEXT,
    age          INTEGER,
    occupation   TEXT,
    color        TEXT,
    description  TEXT,
    secret       TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_characters_case ON characters (case_id);

CREATE TABLE IF NOT EXISTS places (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    type         TEXT,
    parent_id    INTEGER REFERENCES places (id) ON DELETE SET NULL,
    address      TEXT,
    description  TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_places_case ON places (case_id);

CREATE TABLE IF NOT EXISTS assets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    type         TEXT,
    value        REAL,
    location_id  INTEGER REFERENCES places (id) ON DELETE SET NULL,
    description  TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_case ON assets (case_id);
