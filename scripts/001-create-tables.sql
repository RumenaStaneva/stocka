-- Stocka Invoice Management - Complete Database Schema
-- Includes multi-tenant support: organizations, shops, roles
-- Run this to create a fresh database from scratch

-- ============================================================
-- Drop everything (order matters due to foreign keys)
-- ============================================================

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS invite_tokens CASCADE;
DROP TABLE IF EXISTS invoice_tags CASCADE;
DROP TABLE IF EXISTS line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================================
-- Organizations & Shops
-- ============================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Users (with role, org, shop, invite support)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'shop_manager',        -- 'platform_admin', 'org_admin', 'shop_manager'
  organization_id UUID REFERENCES organizations(id),        -- NULL for platform_admin
  shop_id UUID REFERENCES shops(id),                        -- NULL for org_admin and platform_admin
  status VARCHAR(20) NOT NULL DEFAULT 'active',             -- 'invited', 'active', 'disabled'
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Invite tokens (one-time links for new users to set password)
-- ============================================================

CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Folders (hierarchical, scoped to org/shop)
-- ============================================================

CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  shop_id UUID REFERENCES shops(id),
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  path TEXT DEFAULT '/',
  depth INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, parent_id, name)
);

-- ============================================================
-- Tags (scoped to org/shop)
-- ============================================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  shop_id UUID REFERENCES shops(id),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ============================================================
-- Invoices (scoped to shop)
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id),
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

  -- Original file
  original_file_url TEXT NOT NULL,
  original_file_name VARCHAR(255),
  file_type VARCHAR(50),

  -- Document data
  document_type VARCHAR(50) DEFAULT 'invoice',   -- 'invoice' | 'order'
  invoice_number VARCHAR(255),

  -- Доставчик (Vendor/Supplier)
  vendor_name VARCHAR(255),
  vendor_eik VARCHAR(255),
  vendor_city VARCHAR(255),
  vendor_address TEXT,
  vendor_mol VARCHAR(255),
  vendor_phone VARCHAR(100),

  -- Получател (Recipient)
  recipient_name VARCHAR(255),
  recipient_eik VARCHAR(255),
  recipient_city VARCHAR(255),
  recipient_address TEXT,
  recipient_mol VARCHAR(255),
  recipient_phone VARCHAR(100),

  -- Dates & amounts
  invoice_date DATE,
  due_date DATE,
  subtotal DECIMAL(12, 2),
  tax_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  currency VARCHAR(10) DEFAULT 'BGN',
  amount_in_words TEXT,
  payment_method VARCHAR(255),

  notes TEXT,

  -- AI extraction metadata
  extracted_raw JSONB,
  extraction_confidence DECIMAL(3, 2),
  status VARCHAR(50) DEFAULT 'pending',    -- pending, extracted, verified, error
  is_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Line items
-- ============================================================

CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_code VARCHAR(100),
  description TEXT,
  unit VARCHAR(50),
  quantity DECIMAL(10, 3),
  unit_price DECIMAL(12, 2),
  total_price DECIMAL(12, 2),
  batch_number VARCHAR(100),
  is_crossed_out BOOLEAN NOT NULL DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Invoice-Tags junction
-- ============================================================

CREATE TABLE invoice_tags (
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (invoice_id, tag_id)
);

-- ============================================================
-- Audit log
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_shop_id ON users(shop_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_shops_organization_id ON shops(organization_id);

CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_path ON folders(path);
CREATE INDEX idx_folders_organization_id ON folders(organization_id);
CREATE INDEX idx_folders_shop_id ON folders(shop_id);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_organization_id ON tags(organization_id);
CREATE INDEX idx_tags_shop_id ON tags(shop_id);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_shop_id ON invoices(shop_id);
CREATE INDEX idx_invoices_folder_id ON invoices(folder_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_vendor_name ON invoices(vendor_name);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

CREATE INDEX idx_line_items_invoice_id ON line_items(invoice_id);

CREATE INDEX idx_invoice_tags_invoice_id ON invoice_tags(invoice_id);
CREATE INDEX idx_invoice_tags_tag_id ON invoice_tags(tag_id);

CREATE INDEX idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX idx_invite_tokens_user_id ON invite_tokens(user_id);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate folder path and depth
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

CREATE TRIGGER set_folder_path
  BEFORE INSERT OR UPDATE OF parent_id ON folders
  FOR EACH ROW EXECUTE FUNCTION update_folder_path();
