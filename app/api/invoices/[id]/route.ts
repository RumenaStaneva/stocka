import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { jwtVerify } from "jose";

const sql = neon(process.env.DATABASE_URL!);

async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
    const { payload } = await jwtVerify(token, secret);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoices = await sql`
      SELECT 
        i.id,
        i.user_id,
        i.folder_id,
        i.invoice_number,
        i.vendor_name,
        i.vendor_address,
        i.invoice_date,
        i.due_date,
        i.subtotal,
        i.tax_amount,
        i.total_amount,
        i.currency,
        i.notes,
        i.original_file_url as image_url,
        i.status,
        i.created_at,
        i.updated_at,
        json_agg(
          json_build_object(
            'id', li.id,
            'description', li.description,
            'quantity', li.quantity,
            'unit_price', li.unit_price,
            'amount', li.amount
          )
        ) FILTER (WHERE li.id IS NOT NULL) as line_items
      FROM invoices i
      LEFT JOIN line_items li ON li.invoice_id = i.id
      WHERE i.id = ${id} AND i.user_id = ${userId}
      GROUP BY i.id
    `;

    if (invoices.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoices[0] });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      invoice_number,
      vendor_name,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      currency,
      status,
      line_items,
    } = body;

    // Update the invoice
    const result = await sql`
      UPDATE invoices
      SET 
        invoice_number = COALESCE(${invoice_number}, invoice_number),
        vendor_name = COALESCE(${vendor_name}, vendor_name),
        invoice_date = COALESCE(${invoice_date}, invoice_date),
        due_date = COALESCE(${due_date}, due_date),
        subtotal = COALESCE(${subtotal}, subtotal),
        tax_amount = COALESCE(${tax_amount}, tax_amount),
        total_amount = COALESCE(${total_amount}, total_amount),
        currency = COALESCE(${currency}, currency),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Update line items if provided
    if (line_items && Array.isArray(line_items)) {
      // Delete existing line items
      await sql`DELETE FROM line_items WHERE invoice_id = ${id}`;

      // Insert new line items
      for (const item of line_items) {
        await sql`
          INSERT INTO line_items (invoice_id, description, quantity, unit_price, amount)
          VALUES (${id}, ${item.description}, ${item.quantity}, ${item.unit_price}, ${item.amount})
        `;
      }
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Delete line items first (due to foreign key constraint)
    await sql`DELETE FROM line_items WHERE invoice_id = ${id}`;

    // Delete the invoice
    const result = await sql`
      DELETE FROM invoices
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Invoice deleted" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
