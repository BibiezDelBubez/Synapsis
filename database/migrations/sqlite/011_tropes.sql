-- Sinapsi · Migrazione 011 · Archetipi e tropi del caso

-- kind: archetype (ruolo di personaggio), trope (espediente narrativo), rule (regola del genere / fair play)
-- status: planned, used, subverted, avoided
CREATE TABLE IF NOT EXISTS tropes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    kind         TEXT    NOT NULL DEFAULT 'trope',
    status       TEXT    NOT NULL DEFAULT 'planned',
    chapter      INTEGER,
    description  TEXT,
    note         TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tropes_case ON tropes (case_id);

-- Chi incarna un archetipo / dove compare un tropo.
CREATE TABLE IF NOT EXISTS trope_links (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id       INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    trope_id      INTEGER NOT NULL REFERENCES tropes (id) ON DELETE CASCADE,
    character_id  INTEGER REFERENCES characters (id) ON DELETE CASCADE,
    chapter       INTEGER,
    note          TEXT,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trope_links_trope ON trope_links (trope_id);
