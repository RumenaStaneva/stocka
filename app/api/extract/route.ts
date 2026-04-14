import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextRequest, NextResponse } from "next/server";

// Helper to coerce a value to string | null
function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

// Helper to coerce a value to number | null
function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image_url } = await request.json();

    if (!image_url) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    // Fetch the image — private Vercel Blob requires the token
    const imageResponse = await fetch(image_url, {
      headers: {
        authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    console.log(`[extract] fetch status: ${imageResponse.status}`);

    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch invoice image" }, { status: 400 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // Resolve content type
    const rawContentType = imageResponse.headers.get("content-type") || "";
    const mimeType = rawContentType.split(";")[0].trim();
    const urlLower = image_url.toLowerCase();
    const contentType =
      mimeType && mimeType !== "application/octet-stream"
        ? mimeType
        : urlLower.endsWith(".png")
        ? "image/png"
        : urlLower.endsWith(".gif")
        ? "image/gif"
        : urlLower.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

    console.log(`[extract] content-type: ${contentType}, size: ${imageBuffer.byteLength} bytes`);

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert at extracting data from invoices, including Bulgarian invoices.

Analyze this invoice image and extract all the relevant information.
Respond with ONLY a valid JSON object — no explanation, no markdown, no code fences.

Use exactly this structure (use null for missing fields):
{
  "document_type": "invoice | order",
  "invoice_number": "...",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",

  "vendor_name": "...",
  "vendor_eik": "...",
  "vendor_city": "...",
  "vendor_address": "...",
  "vendor_mol": "...",
  "vendor_phone": "...",

  "recipient_name": "...",
  "recipient_eik": "...",
  "recipient_city": "...",
  "recipient_address": "...",
  "recipient_mol": "...",
  "recipient_phone": "...",

  "object_name": "...",
  "operator_name": "...",

  "subtotal": 0.00,
  "tax_amount": 0.00,
  "total_amount": 0.00,
  "currency": "EUR or BGN or USD etc.",
  "amount_in_words": "...",
  "payment_method": "...",

  "bank_name": "...",
  "bank_bic": "...",
  "bank_iban": "...",
  "vat_number": "...",

  "received_by": "...",
  "compiled_by": "...",

  "notes": "...",
  "line_items": [
    {
      "product_code": "...",
      "description": "...",
      "unit": "...",
      "quantity": 0,
      "unit_price": 0.00,
      "total_price": 0.00
    }
  ]
}

RULES:

Language — CRITICAL:
- Copy all text EXACTLY as it appears on the invoice — do NOT translate or transliterate
- If a word is printed in Cyrillic characters on the invoice, output it in Cyrillic — even if it is a borrowed/foreign word (e.g. "грунд", "лепило", "фиксираш" must stay in Cyrillic)
- If a word is printed in Latin characters on the invoice, output it in Latin
- NEVER convert Cyrillic to Latin or Latin to Cyrillic
- The script of each word is determined by how it is physically printed on the invoice, not by the word's origin language

Dates:
- Bulgarian invoices use DD.MM.YYYY format (e.g. "27.02.2026" → "2026-02-27")
- Always output dates as YYYY-MM-DD

Currency:
- Detect the PRIMARY currency actually used on the invoice
- If amounts are shown in both BGN and EUR, use the currency of the "Сума за плащане" / total row
- If the invoice is in EUR only, set currency to "EUR" and extract EUR amounts
- If the invoice is in BGN only, set currency to "BGN"
- Do NOT default to BGN if the invoice is in another currency
- Use the standard ISO code: "BGN", "EUR", "USD", etc.

Document type:
- Title "Фактура" → document_type: "invoice"
- Title "Поръчка" → document_type: "order"
- Default to "invoice" if uncertain

Bulgarian field mappings:
- "Доставчик" / vendor "Фирма" → vendor_name
- Vendor "ЕИК" / "Булстат" → vendor_eik
- Vendor "Град" → vendor_city (city only, NOT combined)
- Vendor "Адрес" → vendor_address (street/address only, NOT combined with city)
- Vendor "МОЛ" → vendor_mol
- Vendor "Телефон" → vendor_phone
- "Получател" / recipient "Фирма" / "КЛИЕНТ" → recipient_name
- Recipient "ЕИК" / "Булстат" → recipient_eik
- Recipient "Град" → recipient_city
- Recipient "Адрес" → recipient_address
- Recipient "МОЛ" → recipient_mol
- Recipient "Телефон" → recipient_phone
- "Обект" → object_name (e.g. "Склад")
- "Потребител" → operator_name
- "Съставил" → compiled_by
- "Получил" → received_by
- "Фактура №" / "Поръчка №" / "Номер" / "No:" → invoice_number
- "Дата" / "Дата на издаване" → invoice_date
- "Дата на падеж" / "Срок за плащане" → due_date
- "Данъчна основа" → subtotal
- "Начислен ДДС" / "ДДС" (amount row) → tax_amount
- "Сума за плащане" / "Общо" / "Всичко" → total_amount
- "Словом" → amount_in_words
- "Начин на плащане" / "Плащане" → payment_method
- "Банка" → bank_name
- "BIC" → bank_bic
- "IBAN" → bank_iban
- "ДДС" (when followed by a VAT id like "BG202620404") → vat_number
- Line items: "Код" → product_code, "Стока"/"Наименование"/"Описание" → description, "Мярка" → unit, "Кол."/"К-во"/"Количество" → quantity, "Цена"/"Ед. цена" → unit_price, "Стойност"/"Общо" → total_price

Amount handling:
- If only a single total is shown (e.g. "Общо" with no ДДС split), put it in total_amount and leave subtotal and tax_amount as null

Currency detection:
- If "Словом" / total_in_words contains "евро" → "EUR"
- If it contains "лев" / "лева" → "BGN"`,
            },
            {
              type: "image",
              image: `data:${contentType};base64,${base64Image}`,
            },
          ],
        },
      ],
    });

    // Strip any accidental markdown fences
    const jsonStr = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      console.error("[extract] failed to parse JSON:", text.slice(0, 300));
      return NextResponse.json({ error: "Failed to parse extracted data" }, { status: 500 });
    }

    // Normalize all fields to the expected types
    const lineItems = Array.isArray(raw.line_items)
      ? (raw.line_items as Record<string, unknown>[]).map((item) => ({
          product_code: str(item.product_code),
          description: str(item.description) ?? "",
          unit: str(item.unit),
          quantity: num(item.quantity),
          unit_price: num(item.unit_price),
          total_price: num(item.total_price),
        }))
      : [];

    const docType = str(raw.document_type);
    const data = {
      document_type: docType === "order" ? "order" : "invoice",
      invoice_number: str(raw.invoice_number),
      invoice_date: str(raw.invoice_date),
      due_date: str(raw.due_date),

      vendor_name: str(raw.vendor_name),
      vendor_eik: str(raw.vendor_eik),
      vendor_city: str(raw.vendor_city),
      vendor_address: str(raw.vendor_address),
      vendor_mol: str(raw.vendor_mol),
      vendor_phone: str(raw.vendor_phone),

      recipient_name: str(raw.recipient_name),
      recipient_eik: str(raw.recipient_eik),
      recipient_city: str(raw.recipient_city),
      recipient_address: str(raw.recipient_address),
      recipient_mol: str(raw.recipient_mol),
      recipient_phone: str(raw.recipient_phone),

      object_name: str(raw.object_name),
      operator_name: str(raw.operator_name),

      subtotal: num(raw.subtotal),
      tax_amount: num(raw.tax_amount),
      total_amount: num(raw.total_amount),
      currency: str(raw.currency) ?? "BGN",
      amount_in_words: str(raw.amount_in_words),
      payment_method: str(raw.payment_method),

      bank_name: str(raw.bank_name),
      bank_bic: str(raw.bank_bic),
      bank_iban: str(raw.bank_iban),
      vat_number: str(raw.vat_number),

      received_by: str(raw.received_by),
      compiled_by: str(raw.compiled_by),

      notes: str(raw.notes),
      line_items: lineItems,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error extracting invoice data:", error);
    return NextResponse.json(
      { error: "Failed to extract invoice data", detail: message },
      { status: 500 }
    );
  }
}
