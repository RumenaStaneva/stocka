import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

// GET — list users (scoped by role)
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);

    if (user.role !== "platform_admin" && user.role !== "org_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let users;
    if (user.role === "platform_admin") {
      users = await sql`
        SELECT u.id, u.email, u.name, u.role, u.status, u.must_change_password,
          u.organization_id, u.shop_id,
          o.name as organization_name, s.name as shop_name
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        LEFT JOIN shops s ON u.shop_id = s.id
        ORDER BY o.name NULLS FIRST, u.role, u.name
      `;
    } else {
      // org_admin — only their org
      users = await sql`
        SELECT u.id, u.email, u.name, u.role, u.status, u.must_change_password,
          u.organization_id, u.shop_id,
          o.name as organization_name, s.name as shop_name
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        LEFT JOIN shops s ON u.shop_id = s.id
        WHERE u.organization_id = ${user.organizationId}::uuid
        ORDER BY u.role, u.name
      `;
    }

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST — create a new user + generate invite token
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);

    if (user.role !== "platform_admin" && user.role !== "org_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, role, organization_id, shop_id } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Имейл и роля са задължителни" },
        { status: 400 }
      );
    }

    // Validate role — platform_admin can only be created via SQL
    if (!["org_admin", "shop_manager"].includes(role)) {
      return NextResponse.json({ error: "Невалидна роля" }, { status: 400 });
    }

    // Determine organization_id
    let orgId = organization_id;
    if (user.role === "org_admin") {
      // org_admin can only create users in their own org
      orgId = user.organizationId;
    }

    // For shop_manager: validate shop and derive org from it
    if (role === "shop_manager") {
      if (!shop_id) {
        return NextResponse.json({ error: "Изберете магазин" }, { status: 400 });
      }
      const shops = await sql`SELECT id, organization_id FROM shops WHERE id = ${shop_id}::uuid`;
      if (shops.length === 0) {
        return NextResponse.json({ error: "Магазинът не е намерен" }, { status: 400 });
      }
      // Derive org from shop
      const shopOrgId = shops[0].organization_id;
      // org_admin can only assign shops in their org
      if (user.role === "org_admin" && shopOrgId !== user.organizationId) {
        return NextResponse.json({ error: "Магазинът не е от вашата организация" }, { status: 403 });
      }
      orgId = shopOrgId;
    }

    // For org_admin: must have an organization
    if (role === "org_admin") {
      if (!orgId) {
        return NextResponse.json({ error: "Изберете организация" }, { status: 400 });
      }
      // Verify org exists
      const orgs = await sql`SELECT id FROM organizations WHERE id = ${orgId}::uuid`;
      if (orgs.length === 0) {
        return NextResponse.json({ error: "Организацията не е намерена" }, { status: 400 });
      }
    }

    // Check for duplicate email
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Потребител с този имейл вече съществува" },
        { status: 409 }
      );
    }

    // Dummy password hash — user will set real password via invite link
    const passwordHash = "$2b$10$INVITED.PLACEHOLDER.NOLOGIN.00000000000000000000000";

    const newUser = await sql`
      INSERT INTO users (email, password_hash, name, role, organization_id, shop_id, status, must_change_password)
      VALUES (${email}, ${passwordHash}, ${name || email.split("@")[0]}, ${role}, ${orgId || null}, ${shop_id || null}, 'invited', true)
      RETURNING id, email, name, role, organization_id, shop_id, status
    `;

    // Generate invite token (expires in 7 days)
    const inviteToken = await sql`
      INSERT INTO invite_tokens (user_id, expires_at)
      VALUES (${newUser[0].id}, NOW() + INTERVAL '7 days')
      RETURNING token
    `;

    const baseUrl = request.headers.get("origin") || request.headers.get("host") || "http://localhost:3000";
    const protocol = baseUrl.startsWith("http") ? "" : "https://";
    const inviteLink = `${protocol}${baseUrl}/invite?token=${inviteToken[0].token}`;

    return NextResponse.json({
      success: true,
      data: {
        user: newUser[0],
        inviteLink,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
