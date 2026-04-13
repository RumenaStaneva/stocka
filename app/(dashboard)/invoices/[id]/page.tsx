"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api, InvoiceDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Building,
  DollarSign,
} from "lucide-react";

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const result = await api.getInvoice(invoiceId);
        setInvoice(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    setDeleting(true);
    try {
      await api.deleteInvoice(invoiceId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
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
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case "reviewed":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Error loading invoice</p>
            <p className="text-muted-foreground mt-1">{error}</p>
            <Link href="/dashboard">
              <Button className="mt-4">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Invoice {invoice.invoice_number || "#" + invoice.id.slice(0, 8)}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(invoice.status)}
              <span className="text-muted-foreground">
                {getStatusLabel(invoice.status)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/invoices/${invoice.id}/review`}>
            <Button variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Image */}
        <Card>
          <CardHeader>
            <CardTitle>Original Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg overflow-hidden border border-border bg-secondary">
              <img
                src={`/api/images?url=${encodeURIComponent(invoice.image_url)}`}
                alt="Invoice"
                className="w-full h-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-muted-foreground" />
                Vendor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Vendor Name</p>
                <p className="font-medium">{invoice.vendor_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{invoice.vendor_address || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(invoice.due_date)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Amounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                Amounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-border font-medium text-lg">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Line Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.line_items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex justify-between items-start p-3 rounded-lg bg-secondary"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.description || "Item"}</p>
                        {item.quantity && (
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                            {item.unit_price &&
                              ` x ${formatCurrency(item.unit_price, invoice.currency)}`}
                          </p>
                        )}
                      </div>
                      <span className="font-medium">
                        {formatCurrency(item.total_price, invoice.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {invoice.tags && invoice.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {invoice.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-sm"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
