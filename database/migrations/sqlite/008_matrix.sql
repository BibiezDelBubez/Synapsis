-- Sinapsi · Migrazione 008 · Sospettati (matrice Chi/Cosa/Dove/Quando/Perché) e registro alibi

-- Un personaggio sospettato per un delitto (evento): movente (perché), mezzo (cosa), verità (è il colpevole?).
CREATE TABLE IF NOT EXISTS suspects (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id          INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    crime_event_id   INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    character_id     INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    motive           TEXT,
    motive_strength  TEXT    NOT NULL DEFAULT 'none',
    means            TEXT,
    means_access     TEXT    NOT NULL DEFAULT 'unknown',
    is_culprit       INTEGER NOT NULL DEFAULT 0,
    note             TEXT,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suspects_crime ON suspects (crime_event_id);

-- Alibi dichiarato da un personaggio: dove dice di essere stato, quando, chi lo conferma, quanto regge.
-- status: solid, weak, false, unverified
CREATE TABLE IF NOT EXISTS alibis (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id           INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    character_id      INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    event_id          INTEGER REFERENCES events (id) ON DELETE SET NULL,
    claim             TEXT    NOT NULL,
    claimed_place_id  INTEGER REFERENCES places (id) ON DELETE SET NULL,
    start_at          TEXT,
    end_at            TEXT,
    witness_id        INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    status            TEXT    NOT NULL DEFAULT 'unverified',
    given_chapter     INTEGER,
    broken_chapter    INTEGER,
    truth             TEXT,
    note              TEXT,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alibis_character ON alibis (character_id);
