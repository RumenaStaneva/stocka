-- Stocka Invoice Management - Database Schema
-- Scalable design with hierarchical folders + tags for flexible organization

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hierarchical folders table (supports unlimited nesting)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  path TEXT DEFAULT '/', -- Materialized path for fast hierarchy queries (e.g., "/id1/id2/id3")
  depth INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, parent_id, name) -- No duplicate names at same level
);

-- Tags table (for cross-cutting organization)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280', -- Hex color for UI display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name) -- No duplicate tag names per user
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  
  -- Original file storage
  original_file_url TEXT NOT NULL,
  original_file_name VARCHAR(255),
  file_type VARCHAR(50),
  
  -- Extracted document data
  document_type VARCHAR(50) DEFAULT 'invoice', -- 'invoice' | 'order' (Фактура | Поръчка)
  invoice_number VARCHAR(255),

  -- Supplier (Доставчик)
  vendor_name VARCHAR(255),
  vendor_eik VARCHAR(255),
  vendor_city VARCHAR(255),
  vendor_address TEXT,
  vendor_mol VARCHAR(255),
  vendor_phone VARCHAR(100),

  -- Recipient (Получател)
  recipient_name VARCHAR(255),
  recipient_eik VARCHAR(255),
  recipient_city VARCHAR(255),
  recipient_address TEXT,
  recipient_mol VARCHAR(255),
  recipient_phone VARCHAR(100),

  invoice_date DATE,
  due_date DATE,
  subtotal DECIMAL(12, 2),
  tax_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  currency VARCHAR(10) DEFAULT 'BGN',
  amount_in_words TEXT,       -- Словом
  payment_method VARCHAR(255),

  notes TEXT,
  
  -- AI extraction metadata
  extracted_raw JSONB, -- Full Claude response for debugging/reprocessing
  extraction_confidence DECIMAL(3, 2), -- 0.00 to 1.00
  status VARCHAR(50) DEFAULT 'pending', -- pending, extracted, verified, error
  is_verified BOOLEAN DEFAULT FALSE, -- User confirmed the extracted data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Line items for each invoice
CREATE TABLE IF NOT EXISTS line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_code VARCHAR(100), -- Код
  description TEXT,          -- Стока / Наименование
  unit VARCHAR(50),          -- Мярка (e.g. "кг.", "бр.")
  quantity DECIMAL(10, 3),
  unit_price DECIMAL(12, 2),
  total_price DECIMAL(12, 2),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice-Tags junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS invoice_tags (
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (invoice_id, tag_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_folder_id ON invoices(folder_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_name ON invoices(vendor_name);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

CREATE INDEX IF NOT EXISTS idx_line_items_invoice_id ON line_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_tags_invoice_id ON invoice_tags(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tags_tag_id ON invoice_tags(tag_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at 
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-calculate folder path and depth
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT;
  parent_depth INT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path = '/' || NEW.id::TEXT;
    NEW.depth = 0;
  ELSE
    SELECT path, depth INTO parent_path, parent_depth
    FROM folders WHERE id = NEW.parent_id;
    
    NEW.path = parent_path || '/' || NEW.id::TEXT;
    NEW.depth = parent_depth + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_folder_path ON folders;
CREATE TRIGGER set_folder_path 
  BEFORE INSERT OR UPDATE OF parent_id ON folders
  FOR EACH ROW EXECUTE FUNCTION update_folder_path();
