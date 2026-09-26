-- Sinapsi · Migrazione 004 · Genealogia, testamenti e proprietà

-- Dati anagrafici utili agli alberi genealogici
ALTER TABLE characters ADD COLUMN family TEXT;
ALTER TABLE characters ADD COLUMN born TEXT;
ALTER TABLE characters ADD COLUMN died TEXT;

-- Filiazione: genitore → figlio (biologica, adottiva, presunta, segreta)
CREATE TABLE IF NOT EXISTS lineages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id     INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    parent_id   INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    child_id    INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL DEFAULT 'biological',
    note        TEXT,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lineages_case ON lineages (case_id);

-- Unioni: matrimoni, convivenze, relazioni clandestine
CREATE TABLE IF NOT EXISTS unions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id     INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    partner_a   INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    partner_b   INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL DEFAULT 'marriage',
    status      TEXT    NOT NULL DEFAULT 'ongoing',
    moment      TEXT,
    secret      INTEGER NOT NULL DEFAULT 0,
    note        TEXT,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_unions_case ON unions (case_id);

-- Testamenti e relativi lasciti
CREATE TABLE IF NOT EXISTS wills (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id      INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    testator_id  INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    moment       TEXT,
    status       TEXT    NOT NULL DEFAULT 'valid',
    location_id  INTEGER REFERENCES places (id) ON DELETE SET NULL,
    description  TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wills_case ON wills (case_id);

CREATE TABLE IF NOT EXISTS bequests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id     INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    will_id     INTEGER NOT NULL REFERENCES wills (id) ON DELETE CASCADE,
    heir_id     INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    asset_id    INTEGER REFERENCES assets (id) ON DELETE SET NULL,
    share       TEXT,
    note        TEXT,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bequests_will ON bequests (will_id);

-- Proprietà: chi possiede quale asset, in che quota e in quale arco della storia
CREATE TABLE IF NOT EXISTS ownerships (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id       INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    owner_id      INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    asset_id      INTEGER NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
    share         REAL    NOT NULL DEFAULT 100,
    from_chapter  INTEGER,
    to_chapter    INTEGER,
    acquisition   TEXT,
    secret        INTEGER NOT NULL DEFAULT 0,
    moment        TEXT,
    note          TEXT,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ownerships_case ON ownerships (case_id);
CREATE INDEX IF NOT EXISTS idx_ownerships_asset ON ownerships (asset_id);
