-- Sinapsi · Migrazione 007 · Indizi e catena di custodia

-- classification: real (porta alla verità), red_herring (falsa pista), misread (errore d'interpretazione)
CREATE TABLE IF NOT EXISTS clues (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id           INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    title             TEXT    NOT NULL,
    kind              TEXT    NOT NULL DEFAULT 'physical',
    classification    TEXT    NOT NULL DEFAULT 'real',
    status            TEXT    NOT NULL DEFAULT 'hidden',
    importance        INTEGER,
    apparent_meaning  TEXT,
    true_meaning      TEXT,
    points_to_id      INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    planted_by_id     INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    place_id          INTEGER REFERENCES places (id) ON DELETE SET NULL,
    event_id          INTEGER REFERENCES events (id) ON DELETE SET NULL,
    found_chapter     INTEGER,
    revealed_chapter  INTEGER,
    description       TEXT,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clues_case ON clues (case_id);

-- Ogni passaggio di mano o di stato di un indizio (chi lo aveva, dove, quando).
CREATE TABLE IF NOT EXISTS custody_steps (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    clue_id      INTEGER NOT NULL REFERENCES clues (id) ON DELETE CASCADE,
    action       TEXT    NOT NULL DEFAULT 'handed',
    holder_id    INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    place_id     INTEGER REFERENCES places (id) ON DELETE SET NULL,
    happened_at  TEXT,
    chapter      INTEGER,
    secret       INTEGER NOT NULL DEFAULT 0,
    note         TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custody_steps_clue ON custody_steps (clue_id);
