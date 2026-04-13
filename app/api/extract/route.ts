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
  "invoice_number": "...",
  "vendor_name": "...",
  "vendor_address": "...",
  "vendor_mol": "...",
  "vendor_eik": "...",
  "recipient_name": "...",
  "recipient_address": "...",
  "recipient_mol": "...",
  "recipient_eik": "...",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "subtotal": 0.00,
  "tax_amount": 0.00,
  "total_amount": 0.00,
  "currency": "EUR or BGN or USD etc.",
  "payment_method": "...",
  "notes": "...",
  "line_items": [
    {
      "description": "...",
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

Bulgarian field mappings:
- "Доставчик" / vendor "Фирма" → vendor_name
- Vendor Град + Адрес (combined) → vendor_address
- Vendor "МОЛ" → vendor_mol
- Vendor "ЕИК" / "Булстат" → vendor_eik
- "Получател" / recipient "Фирма" → recipient_name
- Recipient Град + Адрес (combined) → recipient_address
- Recipient "МОЛ" → recipient_mol
- Recipient "ЕИК" / "Булстат" → recipient_eik
- "Фактура №" / "No:" → invoice_number
- "Дата на издаване" → invoice_date
- "Дата на падеж" / "Срок за плащане" → due_date
- "Данъчна основа" → subtotal
- "Начислен ДДС" / "ДДС" → tax_amount
- "Сума за плащане" / "Общо" → total_amount
- "Начин на плащане" → payment_method
- Line items: "Наименование"/"Описание"/"Ime на стока" → description, "К-во"/"Количество" → quantity, "Ед. цена" → unit_price, "Стойност" → total_price
- IBAN, bank name, BIC → notes`,
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
          description: str(item.description) ?? "",
          quantity: num(item.quantity),
          unit_price: num(item.unit_price),
          total_price: num(item.total_price),
        }))
      : [];

    const data = {
      invoice_number: str(raw.invoice_number),
      vendor_name: str(raw.vendor_name),
      vendor_address: str(raw.vendor_address),
      vendor_mol: str(raw.vendor_mol),
      vendor_eik: str(raw.vendor_eik),
      recipient_name: str(raw.recipient_name),
      recipient_address: str(raw.recipient_address),
      recipient_mol: str(raw.recipient_mol),
      recipient_eik: str(raw.recipient_eik),
      invoice_date: str(raw.invoice_date),
      due_date: str(raw.due_date),
      subtotal: num(raw.subtotal),
      tax_amount: num(raw.tax_amount),
      total_amount: num(raw.total_amount),
      currency: str(raw.currency) ?? "BGN",
      payment_method: str(raw.payment_method),
      notes: str(raw.notes),
      line_items: lineItems,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error extracting invoice data:", error);
    return NextResponse.json(
      { error: "Failed to extract invoice data" },
      { status: 500 }
    );
  }
}
