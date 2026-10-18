ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS contract_id bigint REFERENCES vendor_contracts(id);
CREATE INDEX IF NOT EXISTS vendor_documents_contract_idx ON vendor_documents(contract_id);
