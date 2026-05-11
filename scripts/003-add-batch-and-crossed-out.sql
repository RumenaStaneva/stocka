-- Add batch_number and is_crossed_out to line_items
ALTER TABLE line_items ADD COLUMN batch_number VARCHAR(100);
ALTER TABLE line_items ADD COLUMN is_crossed_out BOOLEAN NOT NULL DEFAULT false;
