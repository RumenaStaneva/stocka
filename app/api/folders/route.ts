import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET all folders for user
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, get all folders (in production, verify JWT and filter by user)
    const folders = await sql`
      SELECT id, name, parent_id, path, created_at, updated_at
      FROM folders
      ORDER BY path, name
    `;

    return NextResponse.json({ success: true, data: folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

// POST create new folder
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, parent_id } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get user_id from first user for now (in production, extract from JWT)
    const users = await sql`SELECT id FROM users LIMIT 1`;
    const userId = users[0]?.id;

    if (!userId) {
      return NextResponse.json({ error: "No user found" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO folders (name, parent_id, user_id)
      VALUES (${name}, ${parent_id || null}, ${userId})
      RETURNING id, name, parent_id, path, created_at
    `;

    return NextResponse.json({ success: true, data: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
