"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, InvoiceDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, AlertCircle, Trash2, Plus } from "lucide-react";

interface LineItemForm {
  description: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

interface FormData {
  invoice_number: string;
  vendor_name: string;
  vendor_address: string;
  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  notes: string;
  line_items: LineItemForm[];
}

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<FormData>({
    invoice_number: "",
    vendor_name: "",
    vendor_address: "",
    invoice_date: "",
    due_date: "",
    subtotal: "",
    tax_amount: "",
    total_amount: "",
    currency: "BGN",
    notes: "",
    line_items: [],
  });

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const result = await api.getInvoice(invoiceId);
        setInvoice(result.data);

        setFormData({
          invoice_number: result.data.invoice_number || "",
          vendor_name: result.data.vendor_name || "",
          vendor_address: result.data.vendor_address || "",
          invoice_date: result.data.invoice_date || "",
          due_date: result.data.due_date || "",
          subtotal: result.data.subtotal?.toString() || "",
          tax_amount: result.data.tax_amount?.toString() || "",
          total_amount: result.data.total_amount?.toString() || "",
          currency: result.data.currency || "USD",
          notes: result.data.notes || "",
          line_items: result.data.line_items?.map((item) => ({
            description: item.description || "",
            quantity: item.quantity?.toString() || "",
            unit_price: item.unit_price?.toString() || "",
            total_price: item.total_price?.toString() || "",
          })) || [],
        });

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  const handleChange = (field: keyof Omit<FormData, "line_items">, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItemForm, value: string) => {
    setFormData((prev) => ({
      ...prev,
      line_items: prev.line_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        { description: "", quantity: "", unit_price: "", total_price: "" },
      ],
    }));
  };

  const removeLineItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError("");

    try {
      await api.updateInvoice(invoiceId, {
        invoice_number: formData.invoice_number || null,
        vendor_name: formData.vendor_name || null,
        vendor_address: formData.vendor_address || null,
        invoice_date: formData.invoice_date || null,
        due_date: formData.due_date || null,
        subtotal: formData.subtotal ? parseFloat(formData.subtotal) : null,
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : null,
        total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
        currency: formData.currency,
        notes: formData.notes || null,
        status: "confirmed",
        line_items: formData.line_items.map((item) => ({
          description: item.description || null,
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
          total_price: item.total_price ? parseFloat(item.total_price) : null,
        })),
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Грешка при зареждане на фактура</p>
            <p className="text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Преглед на извлечените данни</h1>
        <p className="text-muted-foreground mt-1">
          Проверете и редактирайте извлечената информация преди потвърждение
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Invoice Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Оригинална фактура</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice && (
              <div className="relative rounded-lg overflow-hidden border border-border bg-secondary">
                <img
                  src={`/api/images?url=${encodeURIComponent(invoice.image_url)}`}
                  alt="Invoice"
                  className="w-full h-auto"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extracted Data Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Детайли на фактура</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Input
                label="Номер на фактура"
                value={formData.invoice_number}
                onChange={(e) => handleChange("invoice_number", e.target.value)}
              />
              <Input
                label="Валута"
                value={formData.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
              />
              <Input
                label="Дата на издаване"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => handleChange("invoice_date", e.target.value)}
              />
              <Input
                label="Срок за плащане"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange("due_date", e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Vendor Info */}
          <Card>
            <CardHeader>
              <CardTitle>Информация за доставчик</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Доставчик"
                value={formData.vendor_name}
                onChange={(e) => handleChange("vendor_name", e.target.value)}
              />
              <Input
                label="Адрес на доставчик"
                value={formData.vendor_address}
                onChange={(e) => handleChange("vendor_address", e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Amounts */}
          <Card>
            <CardHeader>
              <CardTitle>Суми</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <Input
                label="Междинна сума"
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => handleChange("subtotal", e.target.value)}
              />
              <Input
                label="Данък"
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => handleChange("tax_amount", e.target.value)}
              />
              <Input
                label="Общо"
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => handleChange("total_amount", e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Артикули</CardTitle>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Добави артикул
              </Button>
            </CardHeader>
            <CardContent>
              {formData.line_items.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Няма артикули. Кликнете „Добави артикул", за да добавите.
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.line_items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 rounded-lg bg-secondary">
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <Input
                          placeholder="Описание"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                          className="col-span-2"
                        />
                        <Input
                          placeholder="Кол."
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                        />
                        <Input
                          placeholder="Общо"
                          type="number"
                          step="0.01"
                          value={item.total_price}
                          onChange={(e) => handleLineItemChange(index, "total_price", e.target.value)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Бележки</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-24 rounded-md border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Добавете бележки..."
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Отказ
            </Button>
            <Button onClick={handleConfirm} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Запазване...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Потвърди и запази
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
