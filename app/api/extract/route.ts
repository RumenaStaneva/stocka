import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

// Schema for extracted invoice data
const invoiceSchema = z.object({
  invoice_number: z.string().nullable().describe("The invoice number or ID"),
  vendor_name: z.string().nullable().describe("Name of the vendor/supplier"),
  vendor_address: z.string().nullable().describe("Address of the vendor"),
  invoice_date: z.string().nullable().describe("Date of the invoice in YYYY-MM-DD format"),
  due_date: z.string().nullable().describe("Payment due date in YYYY-MM-DD format"),
  subtotal: z.number().nullable().describe("Subtotal amount before tax"),
  tax_amount: z.number().nullable().describe("Tax amount"),
  total_amount: z.number().nullable().describe("Total amount including tax"),
  currency: z.string().nullable().describe("Currency code (e.g., USD, EUR, BGN)"),
  line_items: z.array(
    z.object({
      description: z.string().describe("Description of the item or service"),
      quantity: z.number().nullable().describe("Quantity of items"),
      unit_price: z.number().nullable().describe("Price per unit"),
      total_price: z.number().nullable().describe("Total amount for this line"),
    })
  ).describe("List of line items on the invoice"),
  notes: z.string().nullable().describe("Any additional notes or payment instructions"),
});

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

    // Fetch the image and convert to base64 — private Vercel Blob requires the token
    const imageResponse = await fetch(image_url, {
      headers: {
        authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    console.log(`[extract] fetch status: ${imageResponse.status}, url: ${image_url}`);

    if (!imageResponse.ok) {
      console.error(`[extract] failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      return NextResponse.json({ error: "Failed to fetch invoice image" }, { status: 400 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // Determine media type — strip parameters (e.g. "image/jpeg; charset=utf-8" → "image/jpeg")
    // and fall back to inferring from the URL extension
    const rawContentType = imageResponse.headers.get("content-type") || "";
    const mimeType = rawContentType.split(";")[0].trim();
    const urlLower = image_url.toLowerCase();
    const contentType =
      mimeType && mimeType !== "application/octet-stream"
        ? mimeType
        : urlLower.endsWith(".png")
        ? "image/png"
        : urlLower.endsWith(".pdf")
        ? "application/pdf"
        : urlLower.endsWith(".gif")
        ? "image/gif"
        : urlLower.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

    console.log(`[extract] content-type: "${rawContentType}" → resolved: ${contentType}, size: ${imageBuffer.byteLength} bytes`);

    const { output } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      output: Output.object({
        schema: invoiceSchema,
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert at extracting data from invoices.

Analyze this invoice image and extract all the relevant information.
Be precise with numbers and dates. If a field is not visible or unclear, set it to null.
For dates, use YYYY-MM-DD format.
For currency, use standard currency codes (USD, EUR, BGN, etc.).

Extract the invoice data now:`,
            },
            {
              type: "image",
              image: `data:${contentType};base64,${base64Image}`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: output,
    });
  } catch (error) {
    console.error("Error extracting invoice data:", error);
    return NextResponse.json(
      { error: "Failed to extract invoice data" },
      { status: 500 }
    );
  }
}
