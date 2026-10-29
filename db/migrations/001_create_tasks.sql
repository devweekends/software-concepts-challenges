CREATE TABLE users (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id   integer NOT NULL REFERENCES users (id),
  title      text NOT NULL,
  due_at     timestamptz,
  status     text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The one local user for module 1. Nobody signs in yet, so the password is a throwaway
-- that nobody knows. The hash is a real scrypt hash (N=16384, r=8, p=1) so the
-- leaked field in challenge 1 looks like a real one. Module 5 adds sign-in.
INSERT INTO users (email, password_hash) VALUES ('lina@example.com', '$scrypt$N=16384,r=8,p=1$20ThVvN+DVWER+RVs5716g==$4UhD+BmtY5wmmSNHSu3FWpMZOcjYP+PGC869ROoGClK/MpubhC+8xAfp/tZRHH8tsUKaA8UlqMz6Sgah7dJQAA==');
