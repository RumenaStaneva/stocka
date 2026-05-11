import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export type UserRole = "platform_admin" | "org_admin" | "shop_manager";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  shopId: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || "stocka-secret-key-change-in-production";

/**
 * Extract and verify the authenticated user from a request's JWT token.
 * Returns null if no valid token is present.
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: UserRole;
      organizationId: string | null;
      shopId: string | null;
    };

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
      shopId: decoded.shopId,
    };
  } catch {
    return null;
  }
}

/**
 * Same as getAuthUser but throws a structured error for use in API routes
 * that always require authentication.
 */
export function requireAuth(request: NextRequest): AuthUser {
  const user = getAuthUser(request);
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
