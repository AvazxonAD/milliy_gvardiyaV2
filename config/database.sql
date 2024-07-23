CREATE TABLE users (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    username VARCHAR(80) NOT NULL,
    adminstatus BOOLEAN DEFAULT false,
    password VARCHAR(100) NOT NULL,
    -- CHECK (LENGTH(password) >= 8)
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bxm (
    summa NUMERIC NOT NULL
);

CREATE TABLE commands (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    commanddate DATE NOT NULL,
    date1 DATE NOT NULL,
    date2 DATE NOT NUll,
    commandnumber INTEGER NOT NULL,
    status BOOLEAN DEFAULT false,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workers (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    FIO VARCHAR(200) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE contracts (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    contractnumber INTEGER NOT NULL,
    contractdate DATE NOT NULL,
    clientname VARCHAR(300) NOT NULL,
    clientaddress VARCHAR(400),
    clientmfo INTEGER,
    clientaccount VARCHAR(23),
    clientstr INTEGER,
    treasuryaccount VARCHAR(100),
    timelimit VARCHAR(500) NOT NULL,
    address VARCHAR(500) NOT NULL,
    discount NUMERIC,
    allworkernumber INTEGER NOT NULL,
    allmoney NUMERIC NOT NULL,
    timemoney NUMERIC NOT NULL,
    money NUMERIC NOT NULL,
    discountmoney NUMERIC,
    ispay BOOLEAN DEFAULT false,
    tasktime INTEGER NOT NULL,
    taskdate DATE NOT NULL,
    accountnumber VARCHAR(20) NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id BIGSERIAL NOT NULL  PRIMARY KEY,
    battalionname VARCHAR(200) NOT NULL,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    contractnumber INTEGER NOT NULL,
    clientName VARCHAR(300) NOT NULL,
    taskDate DATE NOT NULL,
    workernumber INTEGER NOT NULL,
    timemoney INTEGER NOT NULL,
    tasktime INTEGER NOT NULL,
    allmoney INTEGER NOT NULL,
    discountmoney INTEGER,
    money INTEGER NOT NULL,
    done BOOLEAN DEFAULT false,
    inProgress BOOLEAN DEFAULT true,
    notDone BOOLEAN DEFAULT false,
    address VARCHAR(500) NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE worker_tasks (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    worker_name VARCHAR(300) NOT NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, 
    onetimemoney INTEGER NOT NULL,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    tasktime INTEGER NOT NULL,
    summa INTEGER NOT NULL,
    taskdate DATE NOT NULL,
    clientname VARCHAR(200) NOT NULL,
    isPay BOOLEAN DEFAULT false,
    address VARCHAR(400) NOT NULL,
    pay BOOLEAN DEFAULT false,
    command_id INTEGER REFERENCES commands(id),
    user_id INTEGER NOT NUll,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iib_tasks (
    id BIGSERIAL NOT NULL  PRIMARY KEY,
    battalionname VARCHAR(200) NOT NULL,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    contractnumber INTEGER NOT NULL,
    clientname VARCHAR(300) NOT NULL,
    taskdate DATE NOT NULL,
    workernumber INTEGER NOT NULL,
    timemoney INTEGER NOT NULL,
    tasktime INTEGER NOT NULL,
    allmoney INTEGER NOT NULL,
    discountmoney INTEGER,
    money INTEGER NOT NULL,
    ispay BOOLEAN DEFAULT false,
    pay BOOLEAN DEFAULT false,
    command_id INTEGER REFERENCES commands(id),
    address VARCHAR(500) NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accountNumber(
    id BIGSERIAL NOT NULL PRIMARY KEY,
    accountnumber VARCHAR(20) NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_data BYTEA NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);