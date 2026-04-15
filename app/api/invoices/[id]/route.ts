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
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "stocka-secret-key-change-in-production");
    const { payload } = await jwtVerify(token, secret);
    return (payload.userId as string) || (payload.sub as string);
  } catch (error) {
    console.error("[v0] JWT verification error:", error);
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
        i.document_type,
        i.invoice_number,
        i.vendor_name,
        i.vendor_eik,
        i.vendor_city,
        i.vendor_address,
        i.vendor_mol,
        i.vendor_phone,
        i.recipient_name,
        i.recipient_eik,
        i.recipient_city,
        i.recipient_address,
        i.recipient_mol,
        i.recipient_phone,
        to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date,
        to_char(i.due_date, 'YYYY-MM-DD') as due_date,
        i.subtotal,
        i.tax_amount,
        i.total_amount,
        i.currency,
        i.amount_in_words,
        i.payment_method,
        i.notes,
        i.original_file_url as image_url,
        i.status,
        i.created_at,
        i.updated_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', li.id,
                'product_code', li.product_code,
                'description', li.description,
                'unit', li.unit,
                'quantity', li.quantity,
                'unit_price', li.unit_price,
                'total_price', li.total_price
              ) ORDER BY li.sort_order, li.created_at
            )
            FROM line_items li
            WHERE li.invoice_id = i.id
          ),
          '[]'::json
        ) as line_items
      FROM invoices i
      WHERE i.id = ${id} AND i.user_id = ${userId}
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
      document_type,
      invoice_number,
      vendor_name,
      vendor_eik,
      vendor_city,
      vendor_address,
      vendor_mol,
      vendor_phone,
      recipient_name,
      recipient_eik,
      recipient_city,
      recipient_address,
      recipient_mol,
      recipient_phone,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      currency,
      amount_in_words,
      payment_method,
      notes,
      status,
      line_items,
    } = body;

    // Update the invoice
    const result = await sql`
      UPDATE invoices
      SET
        document_type = COALESCE(${document_type}, document_type),
        invoice_number = COALESCE(${invoice_number}, invoice_number),
        vendor_name = COALESCE(${vendor_name}, vendor_name),
        vendor_eik = COALESCE(${vendor_eik}, vendor_eik),
        vendor_city = COALESCE(${vendor_city}, vendor_city),
        vendor_address = COALESCE(${vendor_address}, vendor_address),
        vendor_mol = COALESCE(${vendor_mol}, vendor_mol),
        vendor_phone = COALESCE(${vendor_phone}, vendor_phone),
        recipient_name = COALESCE(${recipient_name}, recipient_name),
        recipient_eik = COALESCE(${recipient_eik}, recipient_eik),
        recipient_city = COALESCE(${recipient_city}, recipient_city),
        recipient_address = COALESCE(${recipient_address}, recipient_address),
        recipient_mol = COALESCE(${recipient_mol}, recipient_mol),
        recipient_phone = COALESCE(${recipient_phone}, recipient_phone),
        invoice_date = COALESCE(${invoice_date}, invoice_date),
        due_date = COALESCE(${due_date}, due_date),
        subtotal = COALESCE(${subtotal}, subtotal),
        tax_amount = COALESCE(${tax_amount}, tax_amount),
        total_amount = COALESCE(${total_amount}, total_amount),
        currency = COALESCE(${currency}, currency),
        amount_in_words = COALESCE(${amount_in_words}, amount_in_words),
        payment_method = COALESCE(${payment_method}, payment_method),
        notes = COALESCE(${notes}, notes),
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
      for (let i = 0; i < line_items.length; i++) {
        const item = line_items[i];
        await sql`
          INSERT INTO line_items (
            invoice_id, product_code, description, unit,
            quantity, unit_price, total_price, sort_order
          )
          VALUES (
            ${id},
            ${item.product_code ?? null},
            ${item.description ?? null},
            ${item.unit ?? null},
            ${item.quantity ?? null},
            ${item.unit_price ?? null},
            ${item.total_price ?? item.amount ?? null},
            ${i}
          )
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
