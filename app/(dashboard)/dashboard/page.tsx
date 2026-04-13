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
        return "Confirmed";
      case "reviewed":
        return "Reviewed";
      default:
        return "Pending";
    }
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage your invoices and extracted data
          </p>
        </div>
        <Link href="/upload" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" />
            Upload Invoice
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["pending", "reviewed", "confirmed"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === status ? null : status)
              }
              className="flex-shrink-0"
            >
              {getStatusLabel(status)}
            </Button>
          ))}
        </div>
      </div>

      {/* Invoices */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">
              Loading...
            </div>
          </CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No invoices found</p>
            <p className="text-muted-foreground mt-1 text-center">
              Upload your first invoice to get started
            </p>
            <Link href="/upload">
              <Button className="mt-4">
                <Upload className="h-4 w-4 mr-2" />
                Upload Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {invoices.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                <Card className="hover:bg-secondary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(invoice.status)}
                          <span className="text-xs text-muted-foreground">
                            {getStatusLabel(invoice.status)}
                          </span>
                        </div>
                        <p className="font-medium truncate">
                          {invoice.vendor_name || "Unknown Vendor"}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {invoice.invoice_number || "No invoice #"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold">
                          {formatCurrency(invoice.total_amount, invoice.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(invoice.invoice_date)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Invoice #
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Vendor
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                        Amount
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
                            {invoice.vendor_name || "Unknown"}
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
                              View
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
