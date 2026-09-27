-- Sinapsi · Migrazione 009 · Capitoli, conoscenze (chi sa cosa) e bugie

CREATE TABLE IF NOT EXISTS chapters (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id           INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    number            INTEGER NOT NULL,
    title             TEXT,
    pov_character_id  INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    story_time        TEXT,
    status            TEXT    NOT NULL DEFAULT 'idea',
    summary           TEXT,
    created_at        TEXT    NOT NULL,
    updated_at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chapters_case ON chapters (case_id, number);

-- Un'informazione che i personaggi (e il lettore) possono sapere o no. is_true = 0: diceria / convinzione falsa.
CREATE TABLE IF NOT EXISTS facts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id         INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    category        TEXT    NOT NULL DEFAULT 'secret',
    is_true         INTEGER NOT NULL DEFAULT 1,
    subject_id      INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    reader_chapter  INTEGER,
    description     TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_facts_case ON facts (case_id);

-- Da quale capitolo un personaggio conosce (o sospetta) un'informazione, e come l'ha saputa.
CREATE TABLE IF NOT EXISTS knowledge (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id       INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    fact_id       INTEGER NOT NULL REFERENCES facts (id) ON DELETE CASCADE,
    character_id  INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    level         TEXT    NOT NULL DEFAULT 'knows',
    chapter       INTEGER,
    how           TEXT    NOT NULL DEFAULT 'always',
    source_id     INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    hides         INTEGER NOT NULL DEFAULT 0,
    note          TEXT,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_knowledge_fact ON knowledge (fact_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_character ON knowledge (character_id);

-- Bugia: chi mente, a chi, cosa dice, quale verità copre, quando la dice e quando viene smascherata.
CREATE TABLE IF NOT EXISTS lies (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id          INTEGER NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
    liar_id          INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    told_to_id       INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    statement        TEXT    NOT NULL,
    truth            TEXT,
    fact_id          INTEGER REFERENCES facts (id) ON DELETE SET NULL,
    event_id         INTEGER REFERENCES events (id) ON DELETE SET NULL,
    motive           TEXT,
    told_chapter     INTEGER,
    exposed_chapter  INTEGER,
    exposed_by_id    INTEGER REFERENCES characters (id) ON DELETE SET NULL,
    note             TEXT,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lies_liar ON lies (liar_id);
