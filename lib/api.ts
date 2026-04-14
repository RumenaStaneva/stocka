const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
    return this.token;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || "Request failed");
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.request<{
      token: string;
      user: { id: string; email: string; name: string };
    }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    this.setToken(result.token);
    return result;
  }

  async getMe() {
    const result = await this.request<{ user: { id: string; email: string; name: string } }>("/auth/me");
    return result.user;
  }

  logout() {
    this.setToken(null);
  }

  // Invoices
  async getInvoices(params?: Record<string, string | number | undefined>) {
    const filtered = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][])
      : undefined;
    const query = filtered && Object.keys(filtered).length > 0
      ? `?${new URLSearchParams(filtered as Record<string, string>)}`
      : "";
    return this.request<{
      success: boolean;
      data: Invoice[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>(`/invoices${query}`);
  }

  async getInvoice(id: string) {
    return this.request<{ success: boolean; data: InvoiceDetail }>(`/invoices/${id}`);
  }

  async createInvoice(data: { image_url: string; image_filename: string; folder_id?: string }) {
    return this.request<{ success: boolean; data: Invoice }>("/invoices", {
      method: "POST",
      body: data,
    });
  }

  async updateInvoice(id: string, data: InvoiceUpdateData) {
    return this.request<{ success: boolean; data: Invoice }>(`/invoices/${id}`, {
      method: "PUT",
      body: data,
    });
  }

  async deleteInvoice(id: string) {
    return this.request<{ success: boolean }>(`/invoices/${id}`, { method: "DELETE" });
  }

  // Upload
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<{ success: boolean; data: { url: string; filename: string } }>("/upload", {
      method: "POST",
      body: formData,
    });
  }

  // Extraction
  async extractInvoice(imageUrl: string) {
    return this.request<{ success: boolean; data: ExtractedData }>("/extract", {
      method: "POST",
      body: { image_url: imageUrl },
    });
  }

  // Folders
  async getFolders() {
    return this.request<{ success: boolean; data: Folder[] }>("/folders");
  }

  async createFolder(data: { name: string; parent_id?: string | null }) {
    return this.request<{ success: boolean; data: Folder }>("/folders", {
      method: "POST",
      body: data,
    });
  }

  async updateFolder(id: string, data: { name?: string; parent_id?: string | null }) {
    return this.request<{ success: boolean; data: Folder }>(`/folders/${id}`, {
      method: "PUT",
      body: data,
    });
  }

  async deleteFolder(id: string) {
    return this.request<{ success: boolean }>(`/folders/${id}`, { method: "DELETE" });
  }

  // Tags
  async getTags() {
    return this.request<{ success: boolean; data: Tag[] }>("/tags");
  }

  async createTag(data: { name: string; color?: string }) {
    return this.request<{ success: boolean; data: Tag }>("/tags", {
      method: "POST",
      body: data,
    });
  }

  async deleteTag(id: string) {
    return this.request<{ success: boolean }>(`/tags/${id}`, { method: "DELETE" });
  }
}

// Types
export interface Invoice {
  id: string;
  user_id: string;
  folder_id: string | null;
  document_type: "invoice" | "order";
  invoice_number: string | null;

  vendor_name: string | null;
  vendor_eik: string | null;
  vendor_city: string | null;
  vendor_address: string | null;
  vendor_mol: string | null;
  vendor_phone: string | null;

  recipient_name: string | null;
  recipient_eik: string | null;
  recipient_city: string | null;
  recipient_address: string | null;
  recipient_mol: string | null;
  recipient_phone: string | null;

  object_name: string | null;
  operator_name: string | null;

  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string;
  amount_in_words: string | null;
  payment_method: string | null;

  bank_name: string | null;
  bank_bic: string | null;
  bank_iban: string | null;
  vat_number: string | null;

  received_by: string | null;
  compiled_by: string | null;

  notes: string | null;
  image_url: string;
  image_filename: string;
  status: "pending" | "reviewed" | "confirmed";
  created_at: string;
  updated_at: string;
}

export interface InvoiceDetail extends Invoice {
  line_items: LineItem[];
  tags: Tag[];
}

export type InvoiceUpdateData = Partial<Omit<InvoiceDetail, 'line_items'>> & {
  line_items?: Omit<LineItem, 'id' | 'invoice_id'>[];
};

export interface LineItem {
  id: string;
  invoice_id: string;
  product_code: string | null;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

export interface ExtractedLineItem {
  product_code: string | null;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

export interface ExtractedData {
  document_type: "invoice" | "order";
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;

  vendor_name: string | null;
  vendor_eik: string | null;
  vendor_city: string | null;
  vendor_address: string | null;
  vendor_mol: string | null;
  vendor_phone: string | null;

  recipient_name: string | null;
  recipient_eik: string | null;
  recipient_city: string | null;
  recipient_address: string | null;
  recipient_mol: string | null;
  recipient_phone: string | null;

  object_name: string | null;
  operator_name: string | null;

  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string;
  amount_in_words: string | null;
  payment_method: string | null;

  bank_name: string | null;
  bank_bic: string | null;
  bank_iban: string | null;
  vat_number: string | null;

  received_by: string | null;
  compiled_by: string | null;

  notes: string | null;
  line_items: ExtractedLineItem[];
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
}

export const api = new ApiClient();
