import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireAuth, AuthError } from "@/lib/auth";

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

const EXTRACTION_PROMPT = `You are an expert at extracting data from invoices, including Bulgarian invoices.

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

  "subtotal": 0.00,
  "tax_amount": 0.00,
  "total_amount": 0.00,
  "currency": "EUR",
  "payment_method": "...",

  "line_items": [
    {
      "product_code": "...",
      "description": "...",
      "batch_number": "...",
      "unit": "...",
      "quantity": 0,
      "unit_price": 0.00,
      "total_price": 0.00,
      "is_crossed_out": false
    }
  ]
}

RULES:

Language (CRITICAL): Copy text EXACTLY as printed. If a word is in Cyrillic, output Cyrillic; if Latin, output Latin. Never transliterate — even for borrowed words like "грунд" or "лепило".

Dates: Bulgarian DD.MM.YYYY → output YYYY-MM-DD.

Currency: Always output "EUR".

Document type: "Фактура" → invoice; "Поръчка" → order; default invoice.

Field mappings:
- Доставчик / vendor Фирма → vendor_name; ЕИК/Булстат → vendor_eik; Град → vendor_city; Адрес → vendor_address; МОЛ → vendor_mol; Телефон → vendor_phone
- Получател / КЛИЕНТ → recipient_name; recipient ЕИК/Булстат → recipient_eik; recipient Град/Адрес/МОЛ/Телефон → recipient_*
- Фактура №/Поръчка №/Номер/No: → invoice_number
- Дата / Дата на издаване → invoice_date; Дата на падеж / Срок за плащане → due_date
- Данъчна основа → subtotal; Начислен ДДС / ДДС (amount row) → tax_amount; Сума за плащане / Общо / Всичко → total_amount
- Начин на плащане / Плащане → payment_method
- Line items: Код → product_code; Стока/Наименование/Описание → description; Мярка → unit; Кол./К-во/Количество → quantity; Цена/Ед. цена → unit_price; Стойност/Общо → total_price

Batch numbers (партиди): Some line items have a batch number (партида) handwritten nearby, usually in the product description area. These are typically 6-digit date codes like "020416", "310316", "080416" — each item may have a DIFFERENT batch number. Read each one individually and carefully — do not assume they are all the same. Some items may also have two numbers (e.g. a batch number and a date). If no batch number is visible for an item, use null.

Crossed-out / cancelled items:
A crossed-out item has a HORIZONTAL LINE drawn THROUGH the printed text of the row. The line goes across the text/numbers, partially obscuring them.
NOT cross-outs: checkmarks (✓), ticks, small marks, or handwritten numbers (batch numbers) next to items. These are annotations, not cancellations.
How to confirm: look at the bottom/margins for a handwritten corrected total lower than the printed total (e.g. original 208.93 with handwritten 181.45). If such a correction exists AND some rows have lines through them, those rows are crossed out.
Set is_crossed_out to true for rows with lines through them. Default to false.
Use the ORIGINAL printed total for total_amount — the app will recalculate.

City vs address: vendor_city and vendor_address are separate (city only, address only). Same for recipient.

Amounts: If only a single total is shown with no ДДС split, put it in total_amount and leave subtotal/tax_amount null.`;

export async function POST(request: NextRequest) {
  try {
    requireAuth(request);

    const { image_url } = await request.json();

    if (!image_url) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    const imageResponse = await fetch(image_url, {
      headers: {
        authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    console.log(`[extract] fetch status: ${imageResponse.status}`);

    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch invoice image" }, { status: 400 });
    }

    const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const resized = await sharp(originalBuffer)
      .rotate()
      .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const base64Image = resized.toString("base64");
    const contentType = "image/jpeg";

    console.log(`[extract] resized: ${originalBuffer.byteLength} → ${resized.byteLength} bytes`);

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: EXTRACTION_PROMPT,
              providerOptions: {
                anthropic: { cacheControl: { type: "ephemeral" } },
              },
            },
            {
              type: "image",
              image: `data:${contentType};base64,${base64Image}`,
            },
          ],
        },
      ],
    });

    const jsonStr = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      console.error("[extract] failed to parse JSON:", text.slice(0, 300));
      return NextResponse.json({ error: "Failed to parse extracted data" }, { status: 500 });
    }

    const lineItems = Array.isArray(raw.line_items)
      ? (raw.line_items as Record<string, unknown>[]).map((item) => ({
          product_code: str(item.product_code),
          description: str(item.description) ?? "",
          batch_number: str(item.batch_number),
          unit: str(item.unit),
          quantity: num(item.quantity),
          unit_price: num(item.unit_price),
          total_price: num(item.total_price),
          is_crossed_out: item.is_crossed_out === true,
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

      subtotal: num(raw.subtotal),
      tax_amount: num(raw.tax_amount),
      total_amount: num(raw.total_amount),
      currency: "EUR",
      payment_method: str(raw.payment_method),

      notes: null,
      line_items: lineItems,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error extracting invoice data:", error);
    return NextResponse.json(
      { error: "Failed to extract invoice data", detail: message },
      { status: 500 }
    );
  }
}
