-- Sinapsi · Migrazione 001 · Struttura iniziale
-- Impostazioni chiave/valore dell'applicazione
CREATE TABLE IF NOT EXISTS settings (
    name        TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Un "Caso" = un romanzo. Tutte le entità future (personaggi, indizi, eventi...)
-- avranno una colonna case_id con ON DELETE CASCADE verso questa tabella.
CREATE TABLE IF NOT EXISTS cases (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    subtitle    TEXT,
    synopsis    TEXT,
    status      TEXT    NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'writing', 'revision', 'closed')),
    color       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status);

INSERT OR IGNORE INTO settings (name, value) VALUES
    ('installed_at', datetime('now', 'localtime')),
    ('active_case_id', NULL);
