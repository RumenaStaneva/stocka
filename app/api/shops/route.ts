import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

// GET — list shops accessible to the current user
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    let shops;

    if (user.role === "platform_admin") {
      shops = await sql`
        SELECT s.id, s.name, s.address, s.organization_id, o.name as organization_name
        FROM shops s
        JOIN organizations o ON s.organization_id = o.id
        ORDER BY o.name, s.name
      `;
    } else if (user.role === "org_admin") {
      shops = await sql`
        SELECT s.id, s.name, s.address, s.organization_id, o.name as organization_name
        FROM shops s
        JOIN organizations o ON s.organization_id = o.id
        WHERE s.organization_id = ${user.organizationId}::uuid
        ORDER BY s.name
      `;
    } else {
      // shop_manager — only their shop
      shops = await sql`
        SELECT s.id, s.name, s.address, s.organization_id, o.name as organization_name
        FROM shops s
        JOIN organizations o ON s.organization_id = o.id
        WHERE s.id = ${user.shopId}::uuid
      `;
    }

    return NextResponse.json({ success: true, data: shops });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching shops:", error);
    return NextResponse.json({ error: "Failed to fetch shops" }, { status: 500 });
  }
}
