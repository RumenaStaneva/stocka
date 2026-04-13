import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "stocka-secret-key-change-in-production"
    ) as { userId: string; email: string };

    // Get user from database
    const users = await sql`
      SELECT id, email, name 
      FROM users 
      WHERE id = ${decoded.userId}::uuid
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: users[0] });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 401 }
    );
  }
}
