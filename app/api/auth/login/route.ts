import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user with org and shop info
    const users = await sql`
      SELECT
        u.id, u.email, u.name, u.password_hash,
        u.role, u.status, u.must_change_password,
        u.organization_id, u.shop_id,
        o.name AS organization_name, o.slug AS organization_slug,
        s.name AS shop_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN shops s ON u.shop_id = s.id
      WHERE u.email = ${email}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check user status
    if (user.status === "disabled") {
      return NextResponse.json(
        { error: "Акаунтът е деактивиран. Свържете се с администратора." },
        { status: 403 }
      );
    }

    if (user.status === "invited") {
      return NextResponse.json(
        { error: "Моля, използвайте линка за покана, за да зададете парола." },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate JWT token with role and scoping info
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id || null,
        shopId: user.shop_id || null,
      },
      process.env.JWT_SECRET || "stocka-secret-key-change-in-production",
      { expiresIn: "7d" }
    );

    // Return user data and token
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
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
