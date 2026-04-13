// User types
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: Omit<User, 'password_hash'>;
}

// Folder types
export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  path: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFolderDto {
  name: string;
  parent_id?: string | null;
}

export interface UpdateFolderDto {
  name?: string;
  parent_id?: string | null;
}

// Tag types
export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: Date;
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

// Invoice types
export type InvoiceStatus = 'pending' | 'reviewed' | 'confirmed';

export interface Invoice {
  id: string;
  user_id: string;
  folder_id: string | null;
  invoice_number: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  invoice_date: Date | null;
  due_date: Date | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string;
  notes: string | null;
  image_url: string;
  image_filename: string;
  status: InvoiceStatus;
  raw_extraction: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  tags?: Tag[];
  line_items?: LineItem[];
}

export interface CreateInvoiceDto {
  folder_id?: string | null;
  image_url: string;
  image_filename: string;
}

export interface UpdateInvoiceDto {
  folder_id?: string | null;
  invoice_number?: string | null;
  vendor_name?: string | null;
  vendor_address?: string | null;
  invoice_date?: Date | null;
  due_date?: Date | null;
  subtotal?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  currency?: string;
  notes?: string | null;
  status?: InvoiceStatus;
  tag_ids?: string[];
}

// Line item types
export interface LineItem {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  created_at: Date;
}

export interface CreateLineItemDto {
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
}

// AI Extraction types
export interface ExtractedInvoiceData {
  invoice_number: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string;
  line_items: {
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
    total_price: number | null;
  }[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Query params
export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  folder_id?: string;
  tag_id?: string;
  vendor_name?: string;
  status?: InvoiceStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
}
