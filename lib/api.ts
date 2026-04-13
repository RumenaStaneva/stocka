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
  async getInvoices(params?: Record<string, string | number>) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>)}` : "";
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

  async updateInvoice(id: string, data: Partial<Invoice>) {
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
  invoice_number: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string;
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

export interface LineItem {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

export interface ExtractedData {
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
