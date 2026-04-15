import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET all invoices with optional filters
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    let invoices;

    // Build query based on filters
    if (search && search !== "undefined" && search !== "") {
      invoices = await sql`
        SELECT 
          i.id, i.user_id, i.folder_id, i.invoice_number, i.vendor_name, i.vendor_address,
          i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
          to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date, i.subtotal, i.tax_amount, i.total_amount, i.currency,
          i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
          f.name as folder_name
        FROM invoices i
        LEFT JOIN folders f ON i.folder_id = f.id
        WHERE 
          i.invoice_number ILIKE ${'%' + search + '%'}
          OR i.vendor_name ILIKE ${'%' + search + '%'}
        ORDER BY i.created_at DESC
      `;
    } else if (status && status !== "undefined" && status !== "") {
      invoices = await sql`
        SELECT 
          i.id, i.user_id, i.folder_id, i.invoice_number, i.vendor_name, i.vendor_address,
          i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
          to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date, i.subtotal, i.tax_amount, i.total_amount, i.currency,
          i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
          f.name as folder_name
        FROM invoices i
        LEFT JOIN folders f ON i.folder_id = f.id
        WHERE i.status = ${status}
        ORDER BY i.created_at DESC
      `;
    } else {
      invoices = await sql`
        SELECT 
          i.id, i.user_id, i.folder_id, i.invoice_number, i.vendor_name, i.vendor_address,
          i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
          to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date, i.subtotal, i.tax_amount, i.total_amount, i.currency,
          i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
          f.name as folder_name
        FROM invoices i
        LEFT JOIN folders f ON i.folder_id = f.id
        ORDER BY i.created_at DESC
      `;
    }

    return NextResponse.json({
      success: true,
      data: invoices,
      total: invoices.length,
      page: 1,
      limit: 50,
      total_pages: 1,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

// POST create new invoice
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { image_url, folder_id } = body;

    // Get user_id from first user for now
    const users = await sql`SELECT id FROM users LIMIT 1`;
    const userId = users[0]?.id;

    if (!userId) {
      return NextResponse.json({ error: "No user found" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO invoices (user_id, original_file_url, folder_id, status)
      VALUES (${userId}, ${image_url}, ${folder_id || null}, 'pending')
      RETURNING id, user_id, folder_id, invoice_number, vendor_name, vendor_address,
        invoice_date, due_date, subtotal, tax_amount, total_amount, currency,
        notes, original_file_url as image_url, status, created_at, updated_at
    `;

    return NextResponse.json({ success: true, data: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
