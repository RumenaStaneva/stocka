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
    const folderId = searchParams.get("folder_id");
    const status = searchParams.get("status");

    let invoices;

    // Build query based on filters
    if (search && search !== "undefined" && search !== "") {
      invoices = await sql`
        SELECT 
          i.*,
          f.name as folder_name,
          COALESCE(
            (SELECT json_agg(t.*) FROM tags t 
             JOIN invoice_tags it ON t.id = it.tag_id 
             WHERE it.invoice_id = i.id), 
            '[]'
          ) as tags
        FROM invoices i
        LEFT JOIN folders f ON i.folder_id = f.id
        WHERE 
          i.invoice_number ILIKE ${'%' + search + '%'}
          OR i.vendor_name ILIKE ${'%' + search + '%'}
        ORDER BY i.created_at DESC
      `;
    } else if (folderId && folderId !== "undefined" && folderId !== "") {
      invoices = await sql`
        SELECT 
          i.*,
          f.name as folder_name,
          COALESCE(
            (SELECT json_agg(t.*) FROM tags t 
             JOIN invoice_tags it ON t.id = it.tag_id 
             WHERE it.invoice_id = i.id), 
            '[]'
          ) as tags
        FROM invoices i
        LEFT JOIN folders f ON i.folder_id = f.id
        WHERE i.folder_id = ${folderId}
        ORDER BY i.created_at DESC
      `;
    } else if (status && status !== "undefined" && status !== "") {
      invoices = await sql`
        SELECT 
          i.*,
          f.name as folder_name,
          COALESCE(
            (SELECT json_agg(t.*) FROM tags t 
             JOIN invoice_tags it ON t.id = it.tag_id 
             WHERE it.invoice_id = i.id), 
            '[]'
          ) as tags
        FROM invoices i
        LEFT JOIN folders f ON i.folder_id = f.id
        WHERE i.status = ${status}
        ORDER BY i.created_at DESC
      `;
    } else {
      invoices = await sql`
        SELECT 
          i.*,
          f.name as folder_name,
          COALESCE(
            (SELECT json_agg(t.*) FROM tags t 
             JOIN invoice_tags it ON t.id = it.tag_id 
             WHERE it.invoice_id = i.id), 
            '[]'
          ) as tags
        FROM invoices i
        LEFT JOIN folders f ON i.folder_id = f.id
        ORDER BY i.created_at DESC
      `;
    }

    return NextResponse.json(invoices);
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
      INSERT INTO invoices (user_id, image_url, folder_id, status)
      VALUES (${userId}, ${image_url}, ${folder_id || null}, 'pending')
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
