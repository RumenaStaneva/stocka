import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const authUser = requireAuth(request);

    // Get full user info with org and shop names
    const users = await sql`
      SELECT
        u.id, u.email, u.name,
        u.role, u.status, u.must_change_password,
        u.organization_id, u.shop_id,
        o.name AS organization_name, o.slug AS organization_slug,
        s.name AS shop_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN shops s ON u.shop_id = s.id
      WHERE u.id = ${authUser.userId}::uuid
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = users[0];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organization_id || null,
        organizationName: user.organization_name || null,
        shopId: user.shop_id || null,
        shopName: user.shop_name || null,
        mustChangePassword: user.must_change_password || false,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 401 }
    );
  }
}
