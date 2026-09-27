-- Sinapsi · Migrazione 006 · Tempi di percorrenza e planimetrie

-- Tempo necessario per andare da un luogo a un altro con un certo mezzo.
-- two_way = 1: vale anche al contrario (stesso tempo).
CREATE TABLE IF NOT EXISTS routes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id        INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    from_place_id  INTEGER NOT NULL REFERENCES places (id) ON DELETE CASCADE,
    to_place_id    INTEGER NOT NULL REFERENCES places (id) ON DELETE CASCADE,
    mode           TEXT    NOT NULL DEFAULT 'walk',
    minutes        INTEGER NOT NULL,
    distance_km    REAL,
    two_way        INTEGER NOT NULL DEFAULT 1,
    note           TEXT,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_routes_case ON routes (case_id);

-- Planimetria o mappa: un'immagine caricata, eventualmente legata a un luogo.
CREATE TABLE IF NOT EXISTS maps (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    place_id     INTEGER REFERENCES places (id) ON DELETE SET NULL,
    image        TEXT,
    scale_note   TEXT,
    description  TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maps_case ON maps (case_id);

-- Segnaposto su una planimetria: x e y sono frazioni (0–1) della larghezza e dell'altezza dell'immagine.
CREATE TABLE IF NOT EXISTS map_pins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id       INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    map_id        INTEGER NOT NULL REFERENCES maps (id) ON DELETE CASCADE,
    label         TEXT    NOT NULL,
    kind          TEXT    NOT NULL DEFAULT 'place',
    x             REAL    NOT NULL DEFAULT 0.5,
    y             REAL    NOT NULL DEFAULT 0.5,
    place_id      INTEGER REFERENCES places (id) ON DELETE SET NULL,
    character_id  INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    color         TEXT,
    note          TEXT,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_map_pins_map ON map_pins (map_id);
