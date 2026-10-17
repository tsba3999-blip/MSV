CREATE TABLE IF NOT EXISTS vendor_documents (
 id bigserial PRIMARY KEY,
 name text NOT NULL,
 legal_entity text NOT NULL DEFAULT '',
 residence text NOT NULL DEFAULT '',
 valid_until date,
 filename text NOT NULL,
 mime text NOT NULL,
 content bytea NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 10485760),
 created_by bigint NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
