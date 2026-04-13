-- Migration: Add Bulgarian invoice fields
-- Adds vendor МОЛ/ЕИК, recipient info, and payment method

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS vendor_mol VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vendor_eik VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recipient_address TEXT,
  ADD COLUMN IF NOT EXISTS recipient_mol VARCHAR(255),
  ADD COLUMN IF NOT EXISTS recipient_eik VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(255);
