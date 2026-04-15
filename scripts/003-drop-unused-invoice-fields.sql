-- Drop fields no longer extracted or displayed: operational context, banking block, signatures.
ALTER TABLE invoices
  DROP COLUMN IF EXISTS object_name,
  DROP COLUMN IF EXISTS operator_name,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_bic,
  DROP COLUMN IF EXISTS bank_iban,
  DROP COLUMN IF EXISTS vat_number,
  DROP COLUMN IF EXISTS received_by,
  DROP COLUMN IF EXISTS compiled_by;
