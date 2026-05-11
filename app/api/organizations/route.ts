import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    let organizations;

    if (user.role === "platform_admin") {
      organizations = await sql`
        SELECT id, name, slug FROM organizations ORDER BY name
      `;
    } else if (user.role === "org_admin") {
      // Only their own org
      organizations = await sql`
        SELECT id, name, slug FROM organizations WHERE id = ${user.organizationId}::uuid
      `;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching organizations:", error);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }
}
