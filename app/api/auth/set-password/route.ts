import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUser } from "@/lib/auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, current_password } = body;

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Паролата трябва да е поне 8 символа" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Case 1: Invite token flow (no auth required)
    if (token) {
      const tokens = await sql`
        SELECT it.id, it.user_id, it.expires_at, it.used_at, u.email, u.name, u.status
        FROM invite_tokens it
        JOIN users u ON it.user_id = u.id
        WHERE it.token = ${token}::uuid
      `;

      if (tokens.length === 0) {
        return NextResponse.json({ error: "Невалиден линк за покана" }, { status: 400 });
      }

      const inviteToken = tokens[0];

      if (inviteToken.used_at) {
        return NextResponse.json({ error: "Този линк вече е бил използван" }, { status: 400 });
      }

      if (new Date(inviteToken.expires_at) < new Date()) {
        return NextResponse.json({ error: "Този линк е изтекъл. Свържете се с администратора за нов." }, { status: 400 });
      }

      // Block if the user already set a password (status is no longer 'invited')
      if (inviteToken.status !== "invited") {
        return NextResponse.json({ error: "Паролата за този акаунт вече е зададена" }, { status: 400 });
      }

      // Set password, activate user, mark token as used — all in one go
      await sql`UPDATE users SET password_hash = ${passwordHash}, status = 'active', must_change_password = false WHERE id = ${inviteToken.user_id}::uuid AND status = 'invited'`;
      await sql`UPDATE invite_tokens SET used_at = NOW() WHERE id = ${inviteToken.id}::uuid`;

      // Invalidate all other tokens for this user
      await sql`UPDATE invite_tokens SET used_at = NOW() WHERE user_id = ${inviteToken.user_id}::uuid AND used_at IS NULL`;

      return NextResponse.json({
        success: true,
        message: "Паролата е зададена успешно. Вече можете да влезете.",
        email: inviteToken.email,
      });
    }

    // Case 2: Logged-in user changing their password
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
    }

    // If changing password (not first-time), verify current password
    if (current_password) {
      const users = await sql`SELECT password_hash FROM users WHERE id = ${user.userId}::uuid`;
      if (users.length === 0) {
        return NextResponse.json({ error: "Потребителят не е намерен" }, { status: 404 });
      }
      const isValid = await bcrypt.compare(current_password, users[0].password_hash);
      if (!isValid) {
        return NextResponse.json({ error: "Текущата парола е грешна" }, { status: 400 });
      }
    }

    await sql`UPDATE users SET password_hash = ${passwordHash}, must_change_password = false WHERE id = ${user.userId}::uuid`;

    return NextResponse.json({ success: true, message: "Паролата е обновена успешно" });
  } catch (error) {
    console.error("Error setting password:", error);
    return NextResponse.json({ error: "Грешка при задаване на парола" }, { status: 500 });
  }
}
