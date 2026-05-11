"use client";

import { useState, useEffect } from "react";
import { api, AdminUser, Shop, Organization } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Copy, Check, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Администратор",
  org_admin: "Мениджър организация",
  shop_manager: "Мениджър магазин",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  invited: "Поканен",
  disabled: "Деактивиран",
};

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("shop_manager");
  const [formOrgId, setFormOrgId] = useState("");
  const [formShopId, setFormShopId] = useState("");

  const canManage = user?.role === "platform_admin" || user?.role === "org_admin";

  // Filter shops by selected org (for platform_admin)
  const filteredShops = user?.role === "platform_admin" && formOrgId
    ? shops.filter((s) => s.organization_id === formOrgId)
    : shops;

  useEffect(() => {
    if (!canManage) {
      router.push("/dashboard");
      return;
    }

    const loadData = async () => {
      try {
        const promises: Promise<unknown>[] = [
          api.getUsers(),
          api.getShops(),
        ];
        if (user?.role === "platform_admin") {
          promises.push(api.getOrganizations());
        }

        const results = await Promise.all(promises);
        setUsers((results[0] as { data: AdminUser[] }).data);
        setShops((results[1] as { data: Shop[] }).data);
        if (results[2]) {
          setOrganizations((results[2] as { data: Organization[] }).data);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [canManage, router, user?.role]);

  // Reset shop when org changes
  useEffect(() => {
    setFormShopId("");
  }, [formOrgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const result = await api.createUser({
        email: formEmail,
        name: formEmail.split("@")[0],
        role: formRole,
        ...(formRole === "org_admin" && formOrgId && { organization_id: formOrgId }),
        ...(formRole === "shop_manager" && formShopId && { shop_id: formShopId }),
      });

      setInviteLink(result.data.inviteLink);
      setUsers((prev) => [...prev, result.data.user]);

      // Reset form
      setFormEmail("");
      setFormRole("shop_manager");
      setFormOrgId("");
      setFormShopId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при създаване");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeInviteModal = () => {
    setInviteLink(null);
    setShowForm(false);
  };

  if (!canManage) return null;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Потребители</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Управлявайте потребителите и правата за достъп
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setInviteLink(null); }} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Добави потребител
        </Button>
      </div>

      {/* Invite Link Modal */}
      {inviteLink && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm font-medium mb-2 text-green-900 dark:text-green-100">
              Потребителят е създаден! Изпратете този линк:
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-white dark:bg-black/20 p-2 rounded border break-all">
                {inviteLink}
              </code>
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400 mt-2">
              Линкът е валиден 7 дни. Изпратете го по Viber, WhatsApp или лично.
            </p>
            <Button size="sm" variant="ghost" onClick={closeInviteModal} className="mt-2">
              Затвори
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create User Form */}
      {showForm && !inviteLink && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Нов потребител</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Имейл (за вход)"
                placeholder="ivan@stocka.app"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Роля</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="shop_manager">Мениджър магазин</option>
                    <option value="org_admin">Мениджър организация</option>
                  </select>
                </div>

                {/* Org picker — platform_admin creating org_admin */}
                {formRole === "org_admin" && user?.role === "platform_admin" && organizations.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Организация</label>
                    <select
                      value={formOrgId}
                      onChange={(e) => setFormOrgId(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Изберете организация...</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Shop picker — for shop_manager role */}
                {formRole === "shop_manager" && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Магазин</label>
                    <select
                      value={formShopId}
                      onChange={(e) => setFormShopId(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Изберете магазин...</option>
                      {filteredShops.map((shop) => (
                        <option key={shop.id} value={shop.id}>
                          {user?.role === "platform_admin"
                            ? `${shop.organization_name} — ${shop.name}`
                            : shop.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating ? "Създаване..." : "Създай и генерирай линк"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Отказ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Зареждане...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Няма потребители</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
                    {u.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      {u.role === "platform_admin" && (
                        <ShieldAlert className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-medium">{ROLE_LABELS[u.role] || u.role}</p>
                    <p className="text-xs text-muted-foreground">{u.shop_name || u.organization_name || "—"}</p>
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    u.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : u.status === "invited"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  }`}>
                    {STATUS_LABELS[u.status] || u.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
