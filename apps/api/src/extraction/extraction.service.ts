import { Injectable, BadRequestException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export interface ExtractedInvoiceData {
  invoice_number: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string;
  line_items: {
    description: string | null;
    quantity: number | null;
    unit_price: number | null;
    total_price: number | null;
  }[];
}

@Injectable()
export class ExtractionService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async extractInvoiceData(imageUrl: string): Promise<ExtractedInvoiceData> {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new BadRequestException('Failed to fetch image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const mediaType = contentType.includes('png') ? 'image/png' : 
                      contentType.includes('webp') ? 'image/webp' : 
                      contentType.includes('gif') ? 'image/gif' : 'image/jpeg';

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Analyze this invoice image and extract all relevant data. Return ONLY a valid JSON object with this exact structure:

{
  "invoice_number": "string or null",
  "vendor_name": "string or null",
  "vendor_address": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "subtotal": number or null,
  "tax_amount": number or null,
  "total_amount": number or null,
  "currency": "USD/EUR/GBP/etc, default USD",
  "line_items": [
    {
      "description": "string or null",
      "quantity": number or null,
      "unit_price": number or null,
      "total_price": number or null
    }
  ]
}

Extract all visible information. Use null for missing fields. For dates, convert to YYYY-MM-DD format. For numbers, use numeric values without currency symbols. Return ONLY the JSON, no explanation.`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new BadRequestException('Failed to extract invoice data');
    }

    try {
      // Clean the response - remove markdown code blocks if present
      let jsonStr = textContent.text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const data = JSON.parse(jsonStr) as ExtractedInvoiceData;
      return data;
    } catch {
      throw new BadRequestException('Failed to parse extracted data');
    }
  }
}
