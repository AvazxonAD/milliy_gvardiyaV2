CREATE TABLE users (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    username VARCHAR(80) NOT NULL,
    adminstatus BOOLEAN DEFAULT false,
    password VARCHAR(100) NOT NULL
    -- CHECK (LENGTH(password) >= 8)
);

CREATE TABLE workers (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    FIO VARCHAR(200) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
)

CREATE TABLE contracts (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    contractNumber INTEGER NOT NULL,
    contractDate DATE NOT NULL,
    clientName VARCHAR(300) NOT NULL,
    clientAddress VARCHAR(400),
    clientMFO INTEGER,
    clientAccount INTEGER,
    clientSTR INTEGER,
    treasuryAccount INTEGER,
    timeLimit VARCHAR(500) NOT NULL,
    address VARCHAR(500) NOT NULL,
    taskDate DATE NOT NULL,
    battalions JSONB
)
