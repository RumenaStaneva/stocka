import { Injectable, BadRequestException } from '@nestjs/common';
import { put, del } from '@vercel/blob';

@Injectable()
export class UploadService {
  async uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
  ): Promise<{ url: string; filename: string }> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, WebP, PDF',
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.length > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `invoices/${timestamp}-${safeName}`;

    const blob = await put(blobPath, file, {
      access: 'public',
      contentType,
    });

    return {
      url: blob.url,
      filename: safeName,
    };
  }

  async deleteFile(url: string): Promise<void> {
    await del(url);
  }
}
