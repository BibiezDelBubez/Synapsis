-- Sinapsi · Migrazione 005 · Eventi (doppia timeline) e partecipanti

-- Ogni evento ha due collocazioni nel tempo:
--   real_*      quando è accaduto davvero (la verità dell'autore)
--   perceived_* quando si crede che sia accaduto (investigatori / lettori); vuoto = come la verità
-- kind: fact (accaduto e noto), hidden (accaduto ma nascosto), false (creduto ma mai accaduto)
CREATE TABLE IF NOT EXISTS events (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id          INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    title            TEXT    NOT NULL,
    kind             TEXT    NOT NULL DEFAULT 'fact',
    real_start       TEXT,
    real_end         TEXT,
    perceived_start  TEXT,
    perceived_end    TEXT,
    place_id         INTEGER REFERENCES places (id) ON DELETE SET NULL,
    chapter          INTEGER,
    narration        TEXT,
    description      TEXT,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_case ON events (case_id);
CREATE INDEX IF NOT EXISTS idx_events_real ON events (real_start);

CREATE TABLE IF NOT EXISTS event_participants (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id       INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    event_id      INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    character_id  INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    role          TEXT    NOT NULL DEFAULT 'present',
    note          TEXT,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants (event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_character ON event_participants (character_id);
