import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface InvoiceRow {
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
  status: string;
  raw_extraction: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

interface LineItemRow {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  created_at: Date;
}

interface TagRow {
  id: string;
  name: string;
  color: string;
}

export interface CreateInvoiceData {
  user_id: string;
  folder_id?: string | null;
  image_url: string;
  image_filename: string;
}

export interface UpdateInvoiceData {
  folder_id?: string | null;
  invoice_number?: string | null;
  vendor_name?: string | null;
  vendor_address?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  subtotal?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  currency?: string;
  notes?: string | null;
  status?: string;
  raw_extraction?: Record<string, unknown> | null;
  line_items?: {
    description?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    total_price?: number | null;
  }[];
  tag_ids?: string[];
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  folder_id?: string;
  tag_id?: string;
  vendor_name?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

@Injectable()
export class InvoicesService {
  constructor(private db: DatabaseService) {}

  async create(data: CreateInvoiceData): Promise<InvoiceRow> {
    const result = await this.db.queryOne<InvoiceRow>(
      `INSERT INTO invoices (user_id, folder_id, image_url, image_filename, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [data.user_id, data.folder_id || null, data.image_url, data.image_filename],
    );
    return result!;
  }

  async findAll(
    userId: string,
    params: InvoiceQueryParams = {},
  ): Promise<{ data: InvoiceRow[]; total: number }> {
    const { page = 1, limit = 20, folder_id, tag_id, vendor_name, status, date_from, date_to, search } = params;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE i.user_id = $1';
    const queryParams: unknown[] = [userId];
    let paramIndex = 2;

    if (folder_id) {
      whereClause += ` AND i.folder_id = $${paramIndex}`;
      queryParams.push(folder_id);
      paramIndex++;
    }

    if (vendor_name) {
      whereClause += ` AND i.vendor_name ILIKE $${paramIndex}`;
      queryParams.push(`%${vendor_name}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (date_from) {
      whereClause += ` AND i.invoice_date >= $${paramIndex}`;
      queryParams.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereClause += ` AND i.invoice_date <= $${paramIndex}`;
      queryParams.push(date_to);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (i.invoice_number ILIKE $${paramIndex} OR i.vendor_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    let joinClause = '';
    if (tag_id) {
      joinClause = 'JOIN invoice_tags it ON i.id = it.invoice_id';
      whereClause += ` AND it.tag_id = $${paramIndex}`;
      queryParams.push(tag_id);
      paramIndex++;
    }

    // Get total count
    const countResult = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT i.id) as count FROM invoices i ${joinClause} ${whereClause}`,
      queryParams,
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get paginated data
    const data = await this.db.query<InvoiceRow>(
      `SELECT DISTINCT i.* FROM invoices i ${joinClause} ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset],
    );

    return { data, total };
  }

  async findById(id: string, userId: string): Promise<InvoiceRow | null> {
    return this.db.queryOne<InvoiceRow>(
      'SELECT * FROM invoices WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
  }

  async findByIdWithDetails(
    id: string,
    userId: string,
  ): Promise<(InvoiceRow & { line_items: LineItemRow[]; tags: TagRow[] }) | null> {
    const invoice = await this.findById(id, userId);
    if (!invoice) return null;

    const lineItems = await this.db.query<LineItemRow>(
      'SELECT * FROM line_items WHERE invoice_id = $1 ORDER BY created_at',
      [id],
    );

    const tags = await this.db.query<TagRow>(
      `SELECT t.id, t.name, t.color
       FROM tags t
       JOIN invoice_tags it ON t.id = it.tag_id
       WHERE it.invoice_id = $1`,
      [id],
    );

    return {
      ...invoice,
      line_items: lineItems,
      tags: tags,
    };
  }

  async update(id: string, userId: string, data: UpdateInvoiceData): Promise<InvoiceRow> {
    const invoice = await this.findById(id, userId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields: (keyof UpdateInvoiceData)[] = [
      'folder_id', 'invoice_number', 'vendor_name', 'vendor_address',
      'invoice_date', 'due_date', 'subtotal', 'tax_amount', 'total_amount',
      'currency', 'notes', 'status', 'raw_extraction'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(field === 'raw_extraction' ? JSON.stringify(data[field]) : data[field]);
        paramIndex++;
      }
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(id, userId);

      await this.db.query(
        `UPDATE invoices SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values,
      );
    }

    // Update line items if provided
    if (data.line_items) {
      // Delete existing line items
      await this.db.query('DELETE FROM line_items WHERE invoice_id = $1', [id]);

      // Insert new line items
      for (const item of data.line_items) {
        await this.db.query(
          `INSERT INTO line_items (invoice_id, description, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.description, item.quantity, item.unit_price, item.total_price],
        );
      }
    }

    // Update tags if provided
    if (data.tag_ids) {
      await this.db.query('DELETE FROM invoice_tags WHERE invoice_id = $1', [id]);

      for (const tagId of data.tag_ids) {
        await this.db.query(
          'INSERT INTO invoice_tags (invoice_id, tag_id) VALUES ($1, $2)',
          [id, tagId],
        );
      }
    }

    return (await this.findById(id, userId))!;
  }

  async delete(id: string, userId: string): Promise<void> {
    const invoice = await this.findById(id, userId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    await this.db.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [id, userId]);
  }
}
