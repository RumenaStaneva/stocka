import { AuthUser } from "./auth";

/**
 * Returns SQL WHERE conditions to filter invoices based on the user's role.
 * Used by GET /api/invoices to scope results.
 *
 * Returns { clause: string, params: Record<string, string> }
 * - platform_admin: no filter (sees everything)
 * - org_admin: invoices from any shop in their organization
 * - shop_manager: invoices from their shop only
 */
export function getInvoiceFilter(user: AuthUser): {
  clause: string;
  params: { organizationId?: string; shopId?: string };
} {
  switch (user.role) {
    case "platform_admin":
      return { clause: "", params: {} };

    case "org_admin":
      return {
        clause:
          "AND i.shop_id IN (SELECT id FROM shops WHERE organization_id = $ORG_ID)",
        params: { organizationId: user.organizationId! },
      };

    case "shop_manager":
      return {
        clause: "AND i.shop_id = $SHOP_ID",
        params: { shopId: user.shopId! },
      };

    default:
      // Unknown role — block everything
      return { clause: "AND 1 = 0", params: {} };
  }
}

/**
 * Check if a user can access a specific invoice.
 * The invoice must have shop_id populated for org/shop checks.
 */
export function canAccessInvoice(
  user: AuthUser,
  invoice: { shop_id: string | null; user_id: string }
): boolean {
  if (user.role === "platform_admin") return true;

  // org_admin can access invoices from any shop in their org
  // (shop membership is checked by the caller via SQL join)
  if (user.role === "org_admin") return true;

  // shop_manager can only access invoices from their shop
  if (user.role === "shop_manager") {
    return invoice.shop_id === user.shopId;
  }

  return false;
}

/**
 * Check if a user can access a specific shop's data.
 */
export function canAccessShop(user: AuthUser, shopId: string): boolean {
  if (user.role === "platform_admin") return true;

  // org_admin can access any shop in their org (caller must verify org membership)
  if (user.role === "org_admin") return true;

  // shop_manager can only access their own shop
  if (user.role === "shop_manager") return user.shopId === shopId;

  return false;
}

/**
 * Check if a user can create/disable/manage other users.
 */
export function canManageUsers(user: AuthUser): boolean {
  return user.role === "platform_admin";
}

/**
 * Check if a user can create new organizations.
 */
export function canManageOrganizations(user: AuthUser): boolean {
  return user.role === "platform_admin";
}

/**
 * Check if a user can upload/edit/delete invoices for a given shop.
 */
export function canWriteToShop(user: AuthUser, shopId: string): boolean {
  if (user.role === "platform_admin") return true;
  if (user.role === "org_admin") return true; // caller must verify shop is in user's org
  if (user.role === "shop_manager") return user.shopId === shopId;
  return false;
}
