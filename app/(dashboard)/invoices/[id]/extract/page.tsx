"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api, Invoice, ExtractedData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

export default function ExtractPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const result = await api.getInvoice(invoiceId);
        setInvoice(result.data);
        
        // If already has extracted data, skip to review
        if (result.data.status !== "pending" && result.data.vendor_name) {
          router.push(`/invoices/${invoiceId}/review`);
          return;
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId, router]);

  const handleExtract = async () => {
    if (!invoice) return;

    setExtracting(true);
    setError("");

    try {
      const result = await api.extractInvoice(invoice.image_url);
      setExtractedData(result.data);

      // Update invoice with extracted data
      await api.updateInvoice(invoiceId, {
        ...result.data,
        status: "reviewed",
        line_items: result.data.line_items,
      });

      // Navigate to review page
      router.push(`/invoices/${invoiceId}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setExtracting(false);
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
            <Button onClick={() => router.push("/upload")} className="mt-4">
              Опитайте отново
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Извличане на данни от фактура</h1>
        <p className="text-muted-foreground mt-1">
          AI ще анализира фактурата и ще извлече цялата релевантна информация
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Изображение на фактура</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice && invoice.image_url && (
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

        {/* Extraction Panel */}
        <Card>
          <CardHeader>
            <CardTitle>AI Извличане</CardTitle>
          </CardHeader>
          <CardContent>
            {!extracting && !extractedData && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium text-center">
                  Готово за извличане
                </p>
                <p className="text-muted-foreground text-center mt-1 mb-6">
                  Кликнете по-долу за анализ на фактурата с AI
                </p>
                {error && (
                  <p className="text-sm text-destructive mb-4">{error}</p>
                )}
                <Button onClick={handleExtract} size="lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Извлечи данни
                </Button>
              </div>
            )}

            {extracting && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Анализиране на фактура...</p>
                <p className="text-muted-foreground mt-1">
                  Това може да отнеме няколко секунди
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
