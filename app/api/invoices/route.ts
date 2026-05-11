import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

// GET all invoices — scoped by user role
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const filterShopId = searchParams.get("shop_id");

    const hasSearch = search && search !== "undefined" && search !== "";
    const hasStatus = status && status !== "undefined" && status !== "";
    const hasShopFilter = filterShopId && filterShopId !== "undefined" && filterShopId !== "";

    let invoices;

    if (user.role === "shop_manager") {
      // Shop manager: only their shop
      if (hasSearch && hasStatus) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.shop_id = ${user.shopId}::uuid AND i.status = ${status}
            AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
          ORDER BY i.created_at DESC`;
      } else if (hasSearch) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.shop_id = ${user.shopId}::uuid
            AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
          ORDER BY i.created_at DESC`;
      } else if (hasStatus) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.shop_id = ${user.shopId}::uuid AND i.status = ${status}
          ORDER BY i.created_at DESC`;
      } else {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.shop_id = ${user.shopId}::uuid
          ORDER BY i.created_at DESC`;
      }
    } else if (user.role === "org_admin") {
      // Org admin: all shops in their organization, optionally filtered to one shop
      if (hasShopFilter) {
        if (hasSearch && hasStatus) {
          invoices = await sql`
            SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
              i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
              to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
              i.subtotal, i.tax_amount, i.total_amount, i.currency,
              i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
              f.name as folder_name, s.name as shop_name, o.name as organization_name
            FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
            WHERE i.shop_id = ${filterShopId}::uuid
              AND s.organization_id = ${user.organizationId}::uuid
              AND i.status = ${status}
              AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
            ORDER BY i.created_at DESC`;
        } else if (hasSearch) {
          invoices = await sql`
            SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
              i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
              to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
              i.subtotal, i.tax_amount, i.total_amount, i.currency,
              i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
              f.name as folder_name, s.name as shop_name, o.name as organization_name
            FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
            WHERE i.shop_id = ${filterShopId}::uuid
              AND s.organization_id = ${user.organizationId}::uuid
              AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
            ORDER BY i.created_at DESC`;
        } else if (hasStatus) {
          invoices = await sql`
            SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
              i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
              to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
              i.subtotal, i.tax_amount, i.total_amount, i.currency,
              i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
              f.name as folder_name, s.name as shop_name, o.name as organization_name
            FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
            WHERE i.shop_id = ${filterShopId}::uuid
              AND s.organization_id = ${user.organizationId}::uuid
              AND i.status = ${status}
            ORDER BY i.created_at DESC`;
        } else {
          invoices = await sql`
            SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
              i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
              to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
              i.subtotal, i.tax_amount, i.total_amount, i.currency,
              i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
              f.name as folder_name, s.name as shop_name, o.name as organization_name
            FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
            WHERE i.shop_id = ${filterShopId}::uuid
              AND s.organization_id = ${user.organizationId}::uuid
            ORDER BY i.created_at DESC`;
        }
      } else {
        if (hasSearch && hasStatus) {
          invoices = await sql`
            SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
              i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
              to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
              i.subtotal, i.tax_amount, i.total_amount, i.currency,
              i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
              f.name as folder_name, s.name as shop_name, o.name as organization_name
            FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
            WHERE s.organization_id = ${user.organizationId}::uuid
              AND i.status = ${status}
              AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
            ORDER BY i.created_at DESC`;
        } else if (hasSearch) {
          invoices = await sql`
            SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
              i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
              to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
              i.subtotal, i.tax_amount, i.total_amount, i.currency,
              i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
              f.name as folder_name, s.name as shop_name, o.name as organization_name
            FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
            WHERE s.organization_id = ${user.organizationId}::uuid
              AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
            ORDER BY i.created_at DESC`;
        } else if (hasStatus) {
          invoices = await sql`
            SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
              i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
              to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
              i.subtotal, i.tax_amount, i.total_amount, i.currency,
              i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
              f.name as folder_name, s.name as shop_name, o.name as organization_name
            FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
            WHERE s.organization_id = ${user.organizationId}::uuid AND i.status = ${status}
            ORDER BY i.created_at DESC`;
        } else {
          invoices = await sql`
            SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
              i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
              to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
              i.subtotal, i.tax_amount, i.total_amount, i.currency,
              i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
              f.name as folder_name, s.name as shop_name, o.name as organization_name
            FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
            WHERE s.organization_id = ${user.organizationId}::uuid
            ORDER BY i.created_at DESC`;
        }
      }
    } else {
      // platform_admin: sees everything
      if (hasShopFilter && hasSearch && hasStatus) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.shop_id = ${filterShopId}::uuid AND i.status = ${status}
            AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
          ORDER BY i.created_at DESC`;
      } else if (hasShopFilter && hasSearch) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.shop_id = ${filterShopId}::uuid
            AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
          ORDER BY i.created_at DESC`;
      } else if (hasShopFilter && hasStatus) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.shop_id = ${filterShopId}::uuid AND i.status = ${status}
          ORDER BY i.created_at DESC`;
      } else if (hasShopFilter) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.shop_id = ${filterShopId}::uuid
          ORDER BY i.created_at DESC`;
      } else if (hasSearch && hasStatus) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.status = ${status}
            AND (i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'})
          ORDER BY i.created_at DESC`;
      } else if (hasSearch) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.invoice_number ILIKE ${'%' + search + '%'} OR i.vendor_name ILIKE ${'%' + search + '%'}
          ORDER BY i.created_at DESC`;
      } else if (hasStatus) {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          WHERE i.status = ${status}
          ORDER BY i.created_at DESC`;
      } else {
        invoices = await sql`
          SELECT i.id, i.user_id, i.folder_id, i.shop_id, i.invoice_number, i.vendor_name, i.vendor_address,
            i.recipient_name, i.recipient_eik, i.recipient_city, i.recipient_address, i.recipient_mol, i.recipient_phone,
            to_char(i.invoice_date, 'YYYY-MM-DD') as invoice_date, to_char(i.due_date, 'YYYY-MM-DD') as due_date,
            i.subtotal, i.tax_amount, i.total_amount, i.currency,
            i.notes, i.original_file_url as image_url, i.status, i.created_at, i.updated_at,
            f.name as folder_name, s.name as shop_name, o.name as organization_name
          FROM invoices i LEFT JOIN folders f ON i.folder_id = f.id LEFT JOIN shops s ON i.shop_id = s.id LEFT JOIN organizations o ON s.organization_id = o.id
          ORDER BY i.created_at DESC`;
      }
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

// POST create new invoice — user_id from JWT, shop_id required
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    const body = await request.json();
    const { image_url, folder_id, shop_id } = body;

    // Determine the shop_id to use
    let invoiceShopId = shop_id;

    if (user.role === "shop_manager") {
      // Shop managers always create invoices for their own shop
      invoiceShopId = user.shopId;
    } else if (user.role === "org_admin") {
      // Org admin must specify a shop within their org
      if (!invoiceShopId) {
        return NextResponse.json(
          { error: "shop_id is required" },
          { status: 400 }
        );
      }
      // Verify shop belongs to their org
      const shops = await sql`
        SELECT id FROM shops WHERE id = ${invoiceShopId}::uuid AND organization_id = ${user.organizationId}::uuid
      `;
      if (shops.length === 0) {
        return NextResponse.json({ error: "Shop not found in your organization" }, { status: 403 });
      }
    }
    // platform_admin can specify any shop_id

    const result = await sql`
      INSERT INTO invoices (user_id, original_file_url, folder_id, shop_id, status)
      VALUES (${user.userId}::uuid, ${image_url}, ${folder_id || null}, ${invoiceShopId || null}, 'pending')
      RETURNING id, user_id, folder_id, shop_id, invoice_number, vendor_name, vendor_address,
        invoice_date, due_date, subtotal, tax_amount, total_amount, currency,
        notes, original_file_url as image_url, status, created_at, updated_at
    `;

    return NextResponse.json({ success: true, data: result[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
