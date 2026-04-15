"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, InvoiceDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, AlertCircle, Trash2, Plus } from "lucide-react";

interface LineItemForm {
  product_code: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

interface FormData {
  document_type: "invoice" | "order";
  invoice_number: string;

  vendor_name: string;
  vendor_eik: string;
  vendor_city: string;
  vendor_address: string;
  vendor_mol: string;
  vendor_phone: string;

  recipient_name: string;
  recipient_eik: string;
  recipient_city: string;
  recipient_address: string;
  recipient_mol: string;
  recipient_phone: string;

  invoice_date: string;
  due_date: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  amount_in_words: string;
  payment_method: string;

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
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<FormData>({
    document_type: "invoice",
    invoice_number: "",
    vendor_name: "",
    vendor_eik: "",
    vendor_city: "",
    vendor_address: "",
    vendor_mol: "",
    vendor_phone: "",
    recipient_name: "",
    recipient_eik: "",
    recipient_city: "",
    recipient_address: "",
    recipient_mol: "",
    recipient_phone: "",
    invoice_date: "",
    due_date: "",
    subtotal: "",
    tax_amount: "",
    total_amount: "",
    currency: "BGN",
    amount_in_words: "",
    payment_method: "",
    notes: "",
    line_items: [],
  });

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const result = await api.getInvoice(invoiceId);
        setInvoice(result.data);

        // Fields that are always visible (required / key fields)
        const alwaysVisible = new Set<string>([
          "document_type",
          "invoice_number",
          "currency",
          "vendor_name",
          "recipient_name",
          "total_amount",
        ]);
        const visible = new Set<string>(alwaysVisible);
        const maybe: Record<string, unknown> = {
          invoice_date: result.data.invoice_date,
          due_date: result.data.due_date,
          vendor_eik: result.data.vendor_eik,
          vendor_mol: result.data.vendor_mol,
          vendor_city: result.data.vendor_city,
          vendor_phone: result.data.vendor_phone,
          vendor_address: result.data.vendor_address,
          recipient_eik: result.data.recipient_eik,
          recipient_mol: result.data.recipient_mol,
          recipient_city: result.data.recipient_city,
          recipient_phone: result.data.recipient_phone,
          recipient_address: result.data.recipient_address,
          subtotal: result.data.subtotal,
          tax_amount: result.data.tax_amount,
          payment_method: result.data.payment_method,
          amount_in_words: result.data.amount_in_words,
        };
        for (const [key, value] of Object.entries(maybe)) {
          if (value !== null && value !== undefined && value !== "") visible.add(key);
        }
        setVisibleFields(visible);

        setFormData({
          document_type: result.data.document_type || "invoice",
          invoice_number: result.data.invoice_number || "",
          vendor_name: result.data.vendor_name || "",
          vendor_eik: result.data.vendor_eik || "",
          vendor_city: result.data.vendor_city || "",
          vendor_address: result.data.vendor_address || "",
          vendor_mol: result.data.vendor_mol || "",
          vendor_phone: result.data.vendor_phone || "",
          recipient_name: result.data.recipient_name || "",
          recipient_eik: result.data.recipient_eik || "",
          recipient_city: result.data.recipient_city || "",
          recipient_address: result.data.recipient_address || "",
          recipient_mol: result.data.recipient_mol || "",
          recipient_phone: result.data.recipient_phone || "",
          invoice_date: result.data.invoice_date || "",
          due_date: result.data.due_date || "",
          subtotal: result.data.subtotal?.toString() || "",
          tax_amount: result.data.tax_amount?.toString() || "",
          total_amount: result.data.total_amount?.toString() || "",
          currency: result.data.currency || "BGN",
          amount_in_words: result.data.amount_in_words || "",
          payment_method: result.data.payment_method || "",
          notes: result.data.notes || "",
          line_items: result.data.line_items?.map((item) => ({
            product_code: item.product_code || "",
            description: item.description || "",
            unit: item.unit || "",
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
        {
          product_code: "",
          description: "",
          unit: "",
          quantity: "",
          unit_price: "",
          total_price: "",
        },
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
        document_type: formData.document_type,
        invoice_number: formData.invoice_number || null,
        vendor_name: formData.vendor_name || null,
        vendor_eik: formData.vendor_eik || null,
        vendor_city: formData.vendor_city || null,
        vendor_address: formData.vendor_address || null,
        vendor_mol: formData.vendor_mol || null,
        vendor_phone: formData.vendor_phone || null,
        recipient_name: formData.recipient_name || null,
        recipient_eik: formData.recipient_eik || null,
        recipient_city: formData.recipient_city || null,
        recipient_address: formData.recipient_address || null,
        recipient_mol: formData.recipient_mol || null,
        recipient_phone: formData.recipient_phone || null,
        invoice_date: formData.invoice_date || null,
        due_date: formData.due_date || null,
        subtotal: formData.subtotal ? parseFloat(formData.subtotal) : null,
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : null,
        total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
        currency: formData.currency,
        amount_in_words: formData.amount_in_words || null,
        payment_method: formData.payment_method || null,
        notes: formData.notes || null,
        status: "confirmed",
        line_items: formData.line_items.map((item) => ({
          product_code: item.product_code || null,
          description: item.description || null,
          unit: item.unit || null,
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
              <CardTitle>Детайли на документ</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Тип документ</label>
                <select
                  className="h-10 rounded-md border border-input bg-secondary px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.document_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      document_type: e.target.value as "invoice" | "order",
                    }))
                  }
                >
                  <option value="invoice">Фактура</option>
                  <option value="order">Поръчка</option>
                </select>
              </div>
              <Input
                label="Номер"
                value={formData.invoice_number}
                onChange={(e) => handleChange("invoice_number", e.target.value)}
              />
              <Input
                label="Валута"
                value={formData.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
              />
              {visibleFields.has("invoice_date") && (
                <Input
                  label="Дата на издаване"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => handleChange("invoice_date", e.target.value)}
                />
              )}
              {visibleFields.has("due_date") && (
                <Input
                  label="Срок за плащане"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange("due_date", e.target.value)}
                />
              )}
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
              {(visibleFields.has("vendor_eik") || visibleFields.has("vendor_mol")) && (
                <div className="grid grid-cols-2 gap-4">
                  {visibleFields.has("vendor_eik") && (
                    <Input
                      label="ЕИК"
                      value={formData.vendor_eik}
                      onChange={(e) => handleChange("vendor_eik", e.target.value)}
                    />
                  )}
                  {visibleFields.has("vendor_mol") && (
                    <Input
                      label="МОЛ"
                      value={formData.vendor_mol}
                      onChange={(e) => handleChange("vendor_mol", e.target.value)}
                    />
                  )}
                </div>
              )}
              {(visibleFields.has("vendor_city") || visibleFields.has("vendor_phone")) && (
                <div className="grid grid-cols-2 gap-4">
                  {visibleFields.has("vendor_city") && (
                    <Input
                      label="Град"
                      value={formData.vendor_city}
                      onChange={(e) => handleChange("vendor_city", e.target.value)}
                    />
                  )}
                  {visibleFields.has("vendor_phone") && (
                    <Input
                      label="Телефон"
                      value={formData.vendor_phone}
                      onChange={(e) => handleChange("vendor_phone", e.target.value)}
                    />
                  )}
                </div>
              )}
              {visibleFields.has("vendor_address") && (
                <Input
                  label="Адрес"
                  value={formData.vendor_address}
                  onChange={(e) => handleChange("vendor_address", e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          {/* Recipient Info */}
          <Card>
            <CardHeader>
              <CardTitle>Информация за получател</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Получател"
                value={formData.recipient_name}
                onChange={(e) => handleChange("recipient_name", e.target.value)}
              />
              {(visibleFields.has("recipient_eik") || visibleFields.has("recipient_mol")) && (
                <div className="grid grid-cols-2 gap-4">
                  {visibleFields.has("recipient_eik") && (
                    <Input
                      label="ЕИК"
                      value={formData.recipient_eik}
                      onChange={(e) => handleChange("recipient_eik", e.target.value)}
                    />
                  )}
                  {visibleFields.has("recipient_mol") && (
                    <Input
                      label="МОЛ"
                      value={formData.recipient_mol}
                      onChange={(e) => handleChange("recipient_mol", e.target.value)}
                    />
                  )}
                </div>
              )}
              {(visibleFields.has("recipient_city") || visibleFields.has("recipient_phone")) && (
                <div className="grid grid-cols-2 gap-4">
                  {visibleFields.has("recipient_city") && (
                    <Input
                      label="Град"
                      value={formData.recipient_city}
                      onChange={(e) => handleChange("recipient_city", e.target.value)}
                    />
                  )}
                  {visibleFields.has("recipient_phone") && (
                    <Input
                      label="Телефон"
                      value={formData.recipient_phone}
                      onChange={(e) => handleChange("recipient_phone", e.target.value)}
                    />
                  )}
                </div>
              )}
              {visibleFields.has("recipient_address") && (
                <Input
                  label="Адрес"
                  value={formData.recipient_address}
                  onChange={(e) => handleChange("recipient_address", e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          {/* Amounts */}
          <Card>
            <CardHeader>
              <CardTitle>Суми и плащане</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {visibleFields.has("subtotal") && (
                  <Input
                    label="Данъчна основа"
                    type="number"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => handleChange("subtotal", e.target.value)}
                  />
                )}
                {visibleFields.has("tax_amount") && (
                  <Input
                    label="ДДС"
                    type="number"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => handleChange("tax_amount", e.target.value)}
                  />
                )}
                <Input
                  label="Сума за плащане"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => handleChange("total_amount", e.target.value)}
                />
              </div>
              {visibleFields.has("payment_method") && (
                <Input
                  label="Начин на плащане"
                  placeholder="напр. Банков път, В брой"
                  value={formData.payment_method}
                  onChange={(e) => handleChange("payment_method", e.target.value)}
                />
              )}
              {visibleFields.has("amount_in_words") && (
                <Input
                  label="Словом"
                  placeholder="напр. Двеста деветдесет и седем евро"
                  value={formData.amount_in_words}
                  onChange={(e) => handleChange("amount_in_words", e.target.value)}
                />
              )}
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
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                          <div className="w-28 shrink-0">
                            <Input
                              label="Код"
                              value={item.product_code}
                              onChange={(e) => handleLineItemChange(index, "product_code", e.target.value)}
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              label="Стока"
                              value={item.description}
                              onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <Input
                            label="Мярка"
                            value={item.unit}
                            onChange={(e) => handleLineItemChange(index, "unit", e.target.value)}
                          />
                          <Input
                            label="Количество"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
                          />
                          <Input
                            label="Цена"
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleLineItemChange(index, "unit_price", e.target.value)}
                          />
                          <Input
                            label="Стойност"
                            type="number"
                            step="0.01"
                            value={item.total_price}
                            onChange={(e) => handleLineItemChange(index, "total_price", e.target.value)}
                          />
                        </div>
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
