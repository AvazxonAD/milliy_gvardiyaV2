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
);

CREATE TABLE bxm (
    summa NUMERIC NOT NULL
);

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
    discount NUMERIC,
    allWorkerNumber INTEGER NOT NULL,
    allMoney NUMERIC NOT NULL,
    timeMoney NUMERIC NOT NULL,
    money NUMERIC NOT NULL,
    discountMoney NUMERIC,
    isPay BOOLEAN DEFAULT false,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id BIGSERIAL NOT NULL  PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    contract_id INTEGER REFERENCES contracts(id),
    contractNumber INTEGER NOT NULL,
    clientName VARCHAR(300) NOT NULL,
    taskDate DATE NOT NULL,
    workerNumber INTEGER NOT NULL,
    timeMoney INTEGER NOT NULL,
    taskTime INTEGER NOT NULL,
    done BOOLEAN DEFAULT false,
    inProgress BOOLEAN DEFAULT true,
    notDone BOOLEAN DEFAULT false
);
