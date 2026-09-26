-- Sinapsi · Migrazione 003 · Legami tra personaggi e loro evoluzione nel tempo

CREATE TABLE IF NOT EXISTS relations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    source_id    INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    target_id    INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    type         TEXT    NOT NULL,
    label        TEXT    NOT NULL,
    sentiment    TEXT    NOT NULL DEFAULT 'neutral',
    intensity    INTEGER NOT NULL DEFAULT 3,
    directed     INTEGER NOT NULL DEFAULT 0,
    secret       INTEGER NOT NULL DEFAULT 0,
    description  TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_relations_case ON relations (case_id);
CREATE INDEX IF NOT EXISTS idx_relations_source ON relations (source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations (target_id);

-- Ogni fase dice: "dal capitolo N il legame diventa …"
CREATE TABLE IF NOT EXISTS relation_phases (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    relation_id  INTEGER NOT NULL REFERENCES relations (id) ON DELETE CASCADE,
    chapter      INTEGER NOT NULL,
    moment       TEXT,
    sentiment    TEXT    NOT NULL,
    note         TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_relation_phases_relation ON relation_phases (relation_id, chapter);
