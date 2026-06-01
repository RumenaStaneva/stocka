"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, Invoice, Shop } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Upload,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Store,
} from "lucide-react";

const MONTH_NAMES_BG = [
  "Януари",
  "Февруари",
  "Март",
  "Април",
  "Май",
  "Юни",
  "Юли",
  "Август",
  "Септември",
  "Октомври",
  "Ноември",
  "Декември",
];

interface MonthGroup {
  key: string;
  label: string;
  invoices: Invoice[];
  total: number;
}

interface ShopGroup {
  shop: string;
  invoices: Invoice[];
  total: number;
  currency: string;
  months: MonthGroup[];
}

interface OrgGroup {
  org: string;
  invoices: Invoice[];
  total: number;
  currency: string;
  shops: ShopGroup[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [shopFilter, setShopFilter] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [expandedOrgs, setExpandedOrgs] = useState<Record<string, boolean>>({});
  const [expandedShops, setExpandedShops] = useState<Record<string, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const showShopFilter = user?.role === "org_admin" || user?.role === "platform_admin";

  const toggleOrg = (org: string) =>
    setExpandedOrgs((prev) => ({ ...prev, [org]: !prev[org] }));
  const toggleShop = (key: string) =>
    setExpandedShops((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleMonth = (key: string) =>
    setExpandedMonths((prev) => ({ ...prev, [key]: !prev[key] }));

  const buildMonths = (invs: Invoice[]): MonthGroup[] => {
    const byMonth = new Map<string, Invoice[]>();
    for (const inv of invs) {
      const d = inv.invoice_date?.split("T")[0];
      const key = d ? d.slice(0, 7) : "unknown";
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(inv);
    }
    return Array.from(byMonth.entries())
      .map(([key, items]) => {
        const sorted = [...items].sort((a, b) =>
          (b.invoice_date || "").localeCompare(a.invoice_date || "")
        );
        let label = "Без дата";
        if (key !== "unknown") {
          const [year, month] = key.split("-");
          label = `${MONTH_NAMES_BG[parseInt(month, 10) - 1]} ${year}`;
        }
        return {
          key,
          label,
          invoices: sorted,
          total: sorted.reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  };

  const groupInvoices = (items: Invoice[]): OrgGroup[] => {
    const byOrg = new Map<string, Invoice[]>();
    for (const inv of items) {
      const org = inv.organization_name?.trim() || inv.recipient_name?.trim() || "Неизвестна организация";
      if (!byOrg.has(org)) byOrg.set(org, []);
      byOrg.get(org)!.push(inv);
    }

    const groups: OrgGroup[] = [];
    for (const [org, orgInvoices] of byOrg) {
      const byShop = new Map<string, Invoice[]>();
      for (const inv of orgInvoices) {
        const shop = inv.shop_name?.trim() || inv.vendor_name?.trim() || "Неизвестен магазин";
        if (!byShop.has(shop)) byShop.set(shop, []);
        byShop.get(shop)!.push(inv);
      }

      const shops: ShopGroup[] = Array.from(byShop.entries())
        .map(([shop, shopInvoices]) => ({
          shop,
          invoices: shopInvoices,
          total: shopInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
          currency: shopInvoices.find((i) => i.currency)?.currency || "EUR",
          months: buildMonths(shopInvoices),
        }))
        .sort((a, b) => a.shop.localeCompare(b.shop, "bg"));

      groups.push({
        org,
        invoices: orgInvoices,
        total: orgInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
        currency: orgInvoices.find((i) => i.currency)?.currency || "EUR",
        shops,
      });
    }

    return groups.sort((a, b) => a.org.localeCompare(b.org, "bg"));
  };

  const orgGroups = groupInvoices(invoices);

  // Load shops for the filter dropdown
  useEffect(() => {
    if (showShopFilter) {
      api.getShops().then((res) => setShops(res.data)).catch(console.error);
    }
  }, [showShopFilter]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const invoicesResult = await api.getInvoices({
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
          ...(shopFilter && { shop_id: shopFilter }),
        });
        setInvoices(invoicesResult.data);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [search, statusFilter, shopFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "reviewed":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Потвърдени";
      case "reviewed":
        return "За преглед";
      default:
        return "Изчакващи";
    }
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("bg-BG", {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}.${month}.${year}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Табло</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Управлявайте фактурите и извлечените данни
          </p>
        </div>
        <Link href="/upload" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" />
            Качи фактура
          </Button>
        </Link>
      </div>

      {/* Shop Filter (for org_admin and platform_admin) */}
      {showShopFilter && shops.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={shopFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setShopFilter(null)}
            className="whitespace-nowrap text-xs sm:text-sm"
          >
            <Store className="h-3 w-3 mr-1" />
            Всички магазини
          </Button>
          {shops.map((shop) => (
            <Button
              key={shop.id}
              variant={shopFilter === shop.id ? "default" : "outline"}
              size="sm"
              onClick={() => setShopFilter(shopFilter === shop.id ? null : shop.id)}
              className="whitespace-nowrap text-xs sm:text-sm"
            >
              <Store className="h-3 w-3 mr-1" />
              {shop.name.replace(/^.*-\s*/, "")}
            </Button>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Търси фактури..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {["pending", "reviewed", "confirmed"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === status ? null : status)
              }
              className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
            >
              {getStatusLabel(status)}
            </Button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">
                Зареждане...
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {statusFilter === "pending"
                  ? "Няма изчакващи фактури"
                  : statusFilter === "reviewed"
                    ? "Няма фактури за преглед"
                    : "Няма намерени фактури"}
              </p>
              {!statusFilter || statusFilter === "confirmed" && (
                <>
                  <p className="text-muted-foreground mt-1 lg:px-10 text-center">
                    Качете първата си фактура, за да започнете
                  </p>
                  <Link href="/upload">
                    <Button className="mt-4">
                      <Upload className="h-4 w-4 mr-2" />
                      Качи фактура
                    </Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {orgGroups.map((group) => {
                const orgOpen = expandedOrgs[group.org] ?? false;
                return (
                  <div key={group.org}>
                    <button
                      type="button"
                      onClick={() => toggleOrg(group.org)}
                      className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-secondary/50 transition-colors text-left"
                    >
                      {orgOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      {orgOpen ? (
                        <FolderOpen className="h-5 w-5 text-primary flex-shrink-0 hidden sm:block" />
                      ) : (
                        <Folder className="h-5 w-5 text-primary flex-shrink-0 hidden sm:block" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm sm:text-base">
                          {group.org}
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {group.invoices.length} фактури
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {group.invoices.length} фактури
                      </span>
                      <span className="text-xs sm:text-sm font-medium sm:w-28 text-right">
                        {formatCurrency(group.total, group.currency)}
                      </span>
                    </button>

                    {orgOpen && (
                      <div className="bg-secondary/20">
                        {group.shops.map((shopGroup) => {
                          const shopKey = `${group.org}::${shopGroup.shop}`;
                          const shopOpen =
                            expandedShops[shopKey] ?? false;
                          return (
                            <div key={shopKey}>
                              <button
                                type="button"
                                onClick={() => toggleShop(shopKey)}
                                className="w-full flex items-center gap-2 sm:gap-3 py-2 pl-6 sm:pl-10 pr-3 sm:pr-4 hover:bg-secondary/50 transition-colors text-left"
                              >
                                {shopOpen ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <Store className="h-4 w-4 text-primary/70 flex-shrink-0 hidden sm:block" />
                                <span className="text-xs sm:text-sm font-medium flex-1 truncate">
                                  {shopGroup.shop}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {shopGroup.invoices.length}
                                </span>
                                <span className="text-xs font-medium sm:w-28 text-right">
                                  {formatCurrency(shopGroup.total, shopGroup.currency)}
                                </span>
                              </button>

                              {shopOpen &&
                                shopGroup.months.map((month) => {
                                  const monthKey = `${shopKey}::${month.key}`;
                                  const monthOpen = expandedMonths[monthKey] ?? true;
                                  return (
                                    <div key={monthKey}>
                                      <button
                                        type="button"
                                        onClick={() => toggleMonth(monthKey)}
                                        className="w-full flex items-center gap-2 sm:gap-3 py-2 pl-8 sm:pl-16 pr-3 sm:pr-4 hover:bg-secondary/50 transition-colors text-left"
                                      >
                                        {monthOpen ? (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden sm:block" />
                                        <span className="text-xs sm:text-sm font-medium flex-1">
                                          {month.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {month.invoices.length}
                                        </span>
                                        <span className="text-xs font-medium sm:w-28 text-right">
                                          {formatCurrency(month.total, shopGroup.currency)}
                                        </span>
                                      </button>

                                      {monthOpen && (
                                        <div>
                                          {month.invoices.map((invoice) => (
                                            <Link
                                              key={invoice.id}
                                              href={`/invoices/${invoice.id}`}
                                              className="flex items-center gap-2 sm:gap-3 py-3 pl-10 sm:pl-24 pr-3 sm:pr-4 hover:bg-secondary/70 transition-colors border-t border-border/50"
                                            >
                                              <div className="flex items-center gap-1 sm:gap-2 sm:w-36">
                                                {getStatusIcon(invoice.status)}
                                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                                  {getStatusLabel(invoice.status)}
                                                </span>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <span className="text-xs sm:text-sm font-mono block truncate">
                                                  {invoice.invoice_number || "-"}
                                                </span>
                                                <span className="text-xs text-muted-foreground sm:hidden">
                                                  {formatDate(invoice.invoice_date)}
                                                </span>
                                              </div>
                                              <span className="text-xs text-muted-foreground w-24 hidden sm:block">
                                                {formatDate(invoice.invoice_date)}
                                              </span>
                                              <span className="text-xs sm:text-sm font-medium sm:w-28 text-right">
                                                {formatCurrency(
                                                  invoice.total_amount,
                                                  invoice.currency
                                                )}
                                              </span>
                                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            </Link>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
