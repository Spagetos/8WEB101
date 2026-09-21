const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('messagerie.db');

// --- Table user ---
db.exec(`
    CREATE TABLE IF NOT EXISTS user (
        IDuser         INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT NOT NULL,
        lastName       TEXT,
        password       TEXT NOT NULL,
        email          TEXT,
        phoneNumber    TEXT,
        lastConnection TEXT
    )
`);

// --- Table message ---
db.exec(`
    CREATE TABLE IF NOT EXISTS message (
        IDmessage   INTEGER PRIMARY KEY AUTOINCREMENT,
        IDsender    INTEGER NOT NULL,
        IDrecever   INTEGER NOT NULL,
        content     TEXT,
        date        TEXT
    )
`);

// --- Table localisation ---
db.exec(`
    CREATE TABLE IF NOT EXISTS localisation (
        IDuser      INTEGER NOT NULL,
        latitude    REAL NOT NULL,
        longitude   REAL NOT NULL,
        date        TEXT
    )
`);

console.log('Tables créées !');