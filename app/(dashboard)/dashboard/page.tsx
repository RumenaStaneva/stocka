"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, Invoice } from "@/lib/api";
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
} from "lucide-react";

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const invoicesResult = await api.getInvoices({
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
        });
        setInvoices(invoicesResult.data);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [search, statusFilter]);

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
      currency: currency || "BGN",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}.${month}.${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Табло</h1>
          <p className="text-muted-foreground mt-1">
            Управлявайте фактурите и извлечените данни
          </p>
        </div>
        <Link href="/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Качи фактура
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Търси фактури..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {["pending", "reviewed", "confirmed"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === status ? null : status)
              }
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
                  <p className="text-muted-foreground mt-1">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                      Статус
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                      Фактура №
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                      Доставчик
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                      Дата
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                      Сума
                    </th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(invoice.status)}
                          <span className="text-sm">
                            {getStatusLabel(invoice.status)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-mono">
                          {invoice.invoice_number || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {invoice.vendor_name || "Неизвестен"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(invoice.invoice_date)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-medium">
                          {formatCurrency(
                            invoice.total_amount,
                            invoice.currency
                          )}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="sm">
                            Преглед
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
